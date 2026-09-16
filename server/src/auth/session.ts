// Session lifecycle (api-spec.md §1). The token is the row's primary key:
// opaque, random, and validated server-side on every request.
import { randomBytes } from 'node:crypto'
import prisma from '../prisma.js'
import type { AuthenticatedUser } from './types.js'

export const SESSION_COOKIE = 'toktickit_session'

/** Absolute lifetime, enforced not defaulted (BR-08, SEC-014). */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

const SAFE_USER = {
  id: true,
  displayName: true,
  email: true,
  role: true,
  mustChangePassword: true,
  isActive: true,
} as const

/** 32 cryptographically random bytes, base64url. Never derived from the user id. */
export function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function startSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = createSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await prisma.session.create({ data: { id: token, userId, expiresAt } })
  return { token, expiresAt }
}

/** The session's user, or null for absent, unknown, expired, or inactive. */
export async function resolveSession(
  token: string,
): Promise<AuthenticatedUser | null> {
  if (typeof token !== 'string' || token.length === 0) return null

  const session = await prisma.session.findUnique({
    where: { id: token },
    select: { expiresAt: true, user: { select: SAFE_USER } },
  })
  if (session === null) return null

  if (session.expiresAt.getTime() <= Date.now()) {
    // Cleared on sight rather than swept on a timer: the read already found it.
    await prisma.session.deleteMany({ where: { id: token } })
    return null
  }

  // Deactivation takes effect on the next request, not when the session
  // happens to expire (BR-39).
  if (!session.user.isActive) return null

  const { isActive: _isActive, ...user } = session.user
  return user
}

export async function endSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: token } })
}

/** Every session but the one in hand (BR-07). */
export async function endOtherSessions(
  userId: string,
  keepToken: string,
): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId, id: { not: keepToken } },
  })
}

/** Every session a user holds (BR-39). */
export async function endAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
}

/** httpOnly, SameSite=Lax, Secure where the transport allows it (SEC-013). */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.SESSION_COOKIE_SECURE === 'true',
    path: '/',
    expires: expiresAt,
  }
}
