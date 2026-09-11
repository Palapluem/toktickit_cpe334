// Authentication operations. Every failure path returns the same thing, so the
// caller learns nothing from which one it hit (BR-03, SEC-002).
import { randomBytes } from 'node:crypto'
import prisma from '../prisma.js'
import { ApiError, type FieldError } from '../http/errors.js'
import { logSecurityEvent } from '../http/securityLog.js'
import { hashPassword, verifyPassword } from './password.js'
import { validateNewPassword } from './policy.js'
import { endOtherSessions } from './session.js'
import type { AuthenticatedUser } from './types.js'

const CREDENTIAL_FIELDS = {
  id: true,
  displayName: true,
  email: true,
  role: true,
  mustChangePassword: true,
  isActive: true,
  passwordHash: true,
} as const

// A hash of a value nobody holds. Compared against when the email is unknown,
// so a missing account costs the same time as a wrong password (SEC-002).
let decoyHash: Promise<string> | null = null
function absentUserHash(): Promise<string> {
  decoyHash ??= hashPassword(randomBytes(32).toString('hex'))
  return decoyHash
}

/** Emails are compared case-insensitively (BR-33); the roster stores them lowercased. */
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export async function authenticate(
  email: unknown,
  password: unknown,
): Promise<AuthenticatedUser | null> {
  const fieldErrors: FieldError[] = []
  if (typeof email !== 'string' || email.trim().length === 0) {
    fieldErrors.push({ field: 'email', message: 'Email is required.' })
  }
  if (typeof password !== 'string' || password.length === 0) {
    fieldErrors.push({ field: 'password', message: 'Password is required.' })
  }
  if (fieldErrors.length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'Email and password are required.',
      fieldErrors,
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email as string) },
    select: CREDENTIAL_FIELDS,
  })

  // Hashed either way: returning early on an unknown email would make the
  // response time itself distinguish the two cases.
  const matches = await verifyPassword(
    password as string,
    user?.passwordHash ?? (await absentUserHash()),
  )

  if (user === null || !matches || !user.isActive) {
    logSecurityEvent('LOGIN_FAILED', { userId: user?.id })
    return null
  }

  const { passwordHash: _hash, isActive: _isActive, ...safe } = user
  return safe
}

/** Clears the gate and ends every other session for that user (BR-07). */
export async function changePassword(
  userId: string,
  currentPassword: unknown,
  newPassword: unknown,
  keepToken: string,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  })

  // The current password is checked before the new one is validated, so a
  // caller without it learns nothing about the password rules.
  const authorized =
    typeof currentPassword === 'string' &&
    (await verifyPassword(currentPassword, user.passwordHash))
  if (!authorized) {
    logSecurityEvent('PASSWORD_CHANGE_REFUSED', { userId })
    throw new ApiError(
      401,
      'INVALID_CREDENTIALS',
      'Current password is incorrect.',
    )
  }

  const fieldErrors = validateNewPassword(newPassword, currentPassword)
  if (fieldErrors.length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'The new password was not accepted.',
      fieldErrors,
    )
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword as string),
      mustChangePassword: false,
    },
  })

  // A password change is often a response to suspected compromise (§11.9).
  await endOtherSessions(userId, keepToken)
}
