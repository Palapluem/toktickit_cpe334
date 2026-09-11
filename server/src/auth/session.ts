// Session lifecycle (api-spec.md §1). Stub: tests/lab-03/session.unit.test.ts
// and auth.api.test.ts drive out the behaviour.
import type { AuthenticatedUser } from './types.js'

export const SESSION_COOKIE = 'toktickit_session'

/** Absolute lifetime, enforced not defaulted (BR-08, SEC-014). */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

/** 32 cryptographically random bytes, base64url. Never derived from the user id. */
export function createSessionToken(): string {
  return ''
}

export async function startSession(
  _userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  return { token: '', expiresAt: new Date(0) }
}

/** The session's user, or null for absent, unknown, expired, or inactive. */
export async function resolveSession(
  _token: string,
): Promise<AuthenticatedUser | null> {
  return null
}

export async function endSession(_token: string): Promise<void> {}

/** Every session but the one in hand (BR-07). */
export async function endOtherSessions(
  _userId: string,
  _keepToken: string,
): Promise<void> {}

/** Every session a user holds (BR-39). */
export async function endAllSessions(_userId: string): Promise<void> {}

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
