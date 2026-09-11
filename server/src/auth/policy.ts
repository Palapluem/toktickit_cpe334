// Password rules. The server owns them; the client may mirror them (SEC-010).
// Stub: tests/lab-03/password.unit.test.ts drives out the behaviour.
import type { FieldError } from '../http/errors.js'

/** Length outperforms forced composition classes (BR-05). */
export const MIN_PASSWORD_LENGTH = 10

export function validateNewPassword(
  _value: unknown,
  _currentPassword?: unknown,
): FieldError[] {
  return []
}
