// Action Taken rules as pure functions (lab-04 specification §5.1; BR-06 to BR-16).
// Stubs for the red phase: neutral values, no rules yet.
import type { FieldError } from '../http/errors.js'

export type ActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const ACTION_STATUSES: readonly ActionStatus[] = []

export const LIMITS = {
  description: { min: 0, max: 0 },
  text: { min: 0, max: 0 },
  attachmentNotes: { max: 0 },
  reason: { min: 0, max: 0 },
} as const

export type MoveVerdict = 'allowed' | 'terminal' | 'invalid'

export function judgeMove(_from: ActionStatus, _to: ActionStatus): MoveVerdict {
  return 'invalid'
}

export function permittedMoves(_from: ActionStatus): readonly ActionStatus[] {
  return []
}

export type TextCheck = { value: string | null; errors: FieldError[] }

/** Trim, treat whitespace-only as empty, and bound the length (BR-16). */
export function readText(
  _raw: unknown,
  _field: string,
  _options: { required: boolean; min: number; max: number },
): TextCheck {
  return { value: null, errors: [] }
}

export type FollowUp = { followUpRequired: boolean; followUpNote: string | null; errors: FieldError[] }

/** The follow-up pair after an edit: a note is required when needed and cleared when not (BR-14). */
export function resolveFollowUp(
  _current: { followUpRequired: boolean; followUpNote: string | null },
  _change: { followUpRequired?: unknown; followUpNote?: unknown },
): FollowUp {
  return { followUpRequired: false, followUpNote: null, errors: [] }
}

/** The Result an Action would complete with: the supplied one, else the stored one (BR-11). */
export function effectiveResult(
  _stored: string | null,
  _supplied: unknown,
): { value: string | null; errors: FieldError[] } {
  return { value: null, errors: [] }
}
