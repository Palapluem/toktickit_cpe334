// Action Taken rules as pure functions (lab-04 specification §5.1; BR-06 to BR-16).
import type { FieldError } from '../http/errors.js'

export type ActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const ACTION_STATUSES: readonly ActionStatus[] = Object.freeze([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
])

export const DESCRIPTION_MAX = 2000
export const TEXT_MAX = 2000
export const ATTACHMENT_NOTES_MAX = 500
export const REASON_MAX = 500

// The lifecycle as data (§5.1). COMPLETED and CANCELLED have no way out (BR-10).
const MOVES: Record<ActionStatus, readonly ActionStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export type MoveVerdict = 'allowed' | 'terminal' | 'invalid'

export function permittedMoves(from: ActionStatus): readonly ActionStatus[] {
  return MOVES[from]
}

/** `terminal` is checked first: a finished Action refuses every move the same way (BR-10). */
export function judgeMove(from: ActionStatus, to: ActionStatus): MoveVerdict {
  if (MOVES[from].length === 0) return 'terminal'
  return MOVES[from].includes(to) ? 'allowed' : 'invalid'
}

export type TextCheck = { value: string | null; errors: FieldError[] }

/** Trim, treat whitespace-only as empty, and bound the length (BR-16). */
export function readText(
  raw: unknown,
  field: string,
  options: { required: boolean; min: number; max: number },
): TextCheck {
  if (raw === undefined || raw === null) {
    return options.required
      ? { value: null, errors: [{ field, message: 'Enter a value.' }] }
      : { value: null, errors: [] }
  }
  if (typeof raw !== 'string') {
    return { value: null, errors: [{ field, message: 'Send text.' }] }
  }

  const value = raw.trim()
  if (value.length === 0) {
    return options.required
      ? { value: null, errors: [{ field, message: 'Enter a value.' }] }
      : { value: null, errors: [] }
  }
  if (value.length < options.min) {
    return { value: null, errors: [{ field, message: `Enter at least ${options.min} characters.` }] }
  }
  if (value.length > options.max) {
    return { value: null, errors: [{ field, message: `Keep this to ${options.max} characters or fewer.` }] }
  }
  return { value, errors: [] }
}

export type FollowUp = {
  followUpRequired: boolean
  followUpNote: string | null
  errors: FieldError[]
}

/** The follow-up pair after an edit: a note is required when needed and cleared when not (BR-14). */
export function resolveFollowUp(
  current: { followUpRequired: boolean; followUpNote: string | null },
  change: { followUpRequired?: unknown; followUpNote?: unknown },
): FollowUp {
  const errors: FieldError[] = []
  let required = current.followUpRequired
  let note = current.followUpNote

  if (change.followUpRequired !== undefined) {
    if (typeof change.followUpRequired === 'boolean') required = change.followUpRequired
    else errors.push({ field: 'followUpRequired', message: 'Send true or false.' })
  }

  const noteSupplied = change.followUpNote !== undefined
  if (noteSupplied) {
    const check = readText(change.followUpNote, 'followUpNote', { required: false, min: 0, max: TEXT_MAX })
    errors.push(...check.errors)
    note = check.value
  }

  if (!required) {
    if (noteSupplied && note !== null && errors.length === 0) {
      errors.push({ field: 'followUpNote', message: 'Turn follow-up on or remove the note.' })
    }
    note = null
  } else if (note === null && !errors.some((e) => e.field === 'followUpNote')) {
    errors.push({ field: 'followUpNote', message: 'Describe the follow-up that is needed.' })
  }

  return { followUpRequired: required, followUpNote: note, errors }
}

/** The Result an Action would complete with: the supplied one, else the stored one (BR-11). */
export function effectiveResult(
  stored: string | null,
  supplied: unknown,
): { value: string | null; errors: FieldError[] } {
  let value = stored
  if (supplied !== undefined) {
    const check = readText(supplied, 'result', { required: false, min: 0, max: TEXT_MAX })
    if (check.errors.length > 0) return { value: null, errors: check.errors }
    value = check.value
  }
  if (value === null || value.trim().length === 0) {
    return { value: null, errors: [{ field: 'result', message: 'Enter the result before completing this Action.' }] }
  }
  return { value, errors: [] }
}
