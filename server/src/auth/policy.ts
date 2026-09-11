// Password rules. The server owns them; the client may mirror them (SEC-010).
import type { FieldError } from '../http/errors.js'

/** Length outperforms forced composition classes (BR-05). */
export const MIN_PASSWORD_LENGTH = 10

/**
 * No composition rule beyond the length floor — a rule the specification
 * cannot justify is a rule tests cannot defend (BR-05).
 */
export function validateNewPassword(
  value: unknown,
  currentPassword?: unknown,
): FieldError[] {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
    return [
      {
        field: 'newPassword',
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      },
    ]
  }

  if (typeof currentPassword === 'string' && value === currentPassword) {
    return [
      {
        field: 'newPassword',
        message: 'New password must be different from the current one.',
      },
    ]
  }

  return []
}
