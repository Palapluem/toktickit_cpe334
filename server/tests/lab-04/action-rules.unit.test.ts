// UNIT-01 to UNIT-03 · lab-04 BR-09 to BR-16, AC-07, AC-10 — Action rules, from the contract not the code.
// Techniques: state transition (TDT-04) and boundary values (TDT-02).
import { describe, expect, it } from 'vitest'
import {
  ACTION_STATUSES,
  effectiveResult,
  judgeMove,
  permittedMoves,
  readText,
  resolveFollowUp,
  type ActionStatus,
} from '../../src/actions/rules.js'

const PERMITTED: Record<ActionStatus, ActionStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

describe('UNIT-01 · BR-09 · BR-10 · every Action move', () => {
  it('knows exactly the four statuses', () => {
    expect([...ACTION_STATUSES]).toEqual(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  })

  for (const from of Object.keys(PERMITTED) as ActionStatus[]) {
    for (const to of Object.keys(PERMITTED) as ActionStatus[]) {
      const terminal = from === 'COMPLETED' || from === 'CANCELLED'
      const expected = terminal ? 'terminal' : PERMITTED[from].includes(to) ? 'allowed' : 'invalid'
      it(`${from} → ${to} is ${expected}`, () => {
        expect(judgeMove(from, to)).toBe(expected)
      })
    }
  }

  it('lists the permitted moves of each status', () => {
    for (const status of ACTION_STATUSES) expect([...permittedMoves(status)]).toEqual(PERMITTED[status])
  })
})

describe('UNIT-02 · BR-12 to BR-16 · field boundaries (below, at, above)', () => {
  const description = { required: true, min: 1, max: 2000 }

  it.each([
    [0, false],
    [1, true],
    [2000, true],
    [2001, false],
  ])('Description of %i characters: accepted=%s', (length, accepted) => {
    const check = readText('x'.repeat(length), 'description', description)
    expect(check.errors.length === 0).toBe(accepted)
    if (accepted) expect(check.value).toHaveLength(length)
    else expect(check.errors[0].field).toBe('description')
  })

  it('trims, and treats whitespace-only as empty', () => {
    expect(readText('  hello  ', 'description', description).value).toBe('hello')
    const blank = readText('   \n\t ', 'description', description)
    expect(blank.errors).toHaveLength(1)
    expect(blank.errors[0].field).toBe('description')
  })

  it('an optional field that is blank becomes null; a non-string is refused', () => {
    const optional = { required: false, min: 0, max: 2000 }
    expect(readText('  ', 'result', optional)).toEqual({ value: null, errors: [] })
    expect(readText(null, 'result', optional)).toEqual({ value: null, errors: [] })
    expect(readText(42, 'result', optional).errors).toHaveLength(1)
  })

  it.each([
    [500, true],
    [501, false],
  ])('Attachment Notes of %i characters: accepted=%s', (length, accepted) => {
    const check = readText('n'.repeat(length), 'attachmentNotes', { required: false, min: 0, max: 500 })
    expect(check.errors.length === 0).toBe(accepted)
  })

  it.each([
    [0, false],
    [1, true],
    [500, true],
    [501, false],
  ])('Cancellation reason of %i characters: accepted=%s', (length, accepted) => {
    const check = readText('r'.repeat(length), 'cancellationReason', { required: true, min: 1, max: 500 })
    expect(check.errors.length === 0).toBe(accepted)
  })

  it('Follow-up Note is required when follow-up is needed (BR-14, AC-10)', () => {
    const none = { followUpRequired: false, followUpNote: null }
    const missing = resolveFollowUp(none, { followUpRequired: true })
    expect(missing.errors.map((e) => e.field)).toEqual(['followUpNote'])

    const given = resolveFollowUp(none, { followUpRequired: true, followUpNote: ' call back ' })
    expect(given).toMatchObject({ followUpRequired: true, followUpNote: 'call back', errors: [] })
  })

  it('Follow-up Note is cleared when follow-up is no longer needed (BR-14)', () => {
    const had = { followUpRequired: true, followUpNote: 'call back' }
    expect(resolveFollowUp(had, { followUpRequired: false })).toMatchObject({
      followUpRequired: false,
      followUpNote: null,
      errors: [],
    })
  })

  it('a note supplied while follow-up stays off is refused', () => {
    const none = { followUpRequired: false, followUpNote: null }
    expect(resolveFollowUp(none, { followUpNote: 'orphan' }).errors.map((e) => e.field)).toEqual(['followUpNote'])
  })

  it('a note at 2000 is accepted and at 2001 is refused', () => {
    const none = { followUpRequired: false, followUpNote: null }
    expect(resolveFollowUp(none, { followUpRequired: true, followUpNote: 'n'.repeat(2000) }).errors).toEqual([])
    expect(resolveFollowUp(none, { followUpRequired: true, followUpNote: 'n'.repeat(2001) }).errors).toHaveLength(1)
  })

  it('a non-boolean followUpRequired is refused', () => {
    const none = { followUpRequired: false, followUpNote: null }
    expect(resolveFollowUp(none, { followUpRequired: 'yes' }).errors.map((e) => e.field)).toEqual(['followUpRequired'])
  })
})

describe('UNIT-03 · BR-11 · AC-07 · the Result an Action completes with', () => {
  it('uses the supplied Result over the stored one', () => {
    expect(effectiveResult('old', ' new ')).toEqual({ value: 'new', errors: [] })
  })

  it('falls back to the stored Result when none is supplied', () => {
    expect(effectiveResult('kept', undefined)).toEqual({ value: 'kept', errors: [] })
  })

  it.each([
    [null, undefined],
    [null, ''],
    ['stored', '   '],
    [null, null],
  ])('refuses a blank effective Result (stored=%j supplied=%j)', (stored, supplied) => {
    const check = effectiveResult(stored, supplied)
    expect(check.errors.map((e) => e.field)).toEqual(['result'])
  })

  it('refuses a Result over 2000 characters', () => {
    expect(effectiveResult(null, 'r'.repeat(2001)).errors).toHaveLength(1)
    expect(effectiveResult(null, 'r'.repeat(2000)).errors).toEqual([])
  })
})
