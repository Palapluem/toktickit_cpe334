// Authentication operations. Stub: tests/lab-03/auth.api.test.ts drives these out.
import type { AuthenticatedUser } from './types.js'

/** The one generic failure. Unknown email, wrong password, and inactive account
 *  are indistinguishable to the caller (BR-03, SEC-002). */
export async function authenticate(
  _email: unknown,
  _password: unknown,
): Promise<AuthenticatedUser | null> {
  return null
}

/** Clears the gate and ends every other session for that user (BR-07). */
export async function changePassword(
  _userId: string,
  _currentPassword: unknown,
  _newPassword: unknown,
  _keepToken: string,
): Promise<void> {}
