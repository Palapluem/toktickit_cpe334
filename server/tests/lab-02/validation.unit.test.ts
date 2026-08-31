// UNIT-03 (#20). BR-19/BR-20/BR-21; TC-005/TC-006.
// TDT-01 equivalence partitions for empty, valid, short, and long text.
// TDT-02 boundary-value analysis for the Summary and Description limits.
import { describe, expect, it } from 'vitest'
import { validateCreateTicketBody } from '../../src/tickets/validation.js'

const VALID_IDS = {
  categoryId: '00000000-0000-4000-8000-000000000001',
  relatedSystemId: '00000000-0000-4000-8000-000000000002',
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    ...VALID_IDS,
    summary: '  Printer queue is stuck  ',
    description: '  Print jobs remain queued after restarting the printer.  ',
    requestedPriority: 'MEDIUM',
    ...overrides,
  }
}

describe('UNIT-03 · BR-19/BR-20/BR-21 · create-ticket validation', () => {
  it('trims Summary and Description before returning the validated value', () => {
    const result = validateCreateTicketBody(validBody())

    expect(result.errors).toEqual([])
    expect(result.value).toMatchObject({
      summary: 'Printer queue is stuck',
      description: 'Print jobs remain queued after restarting the printer.',
    })
  })

  it('accepts Summary and Description at both documented boundaries', () => {
    const lower = validateCreateTicketBody(
      validBody({ summary: 'a'.repeat(5), description: 'b'.repeat(10) }),
    )
    const upper = validateCreateTicketBody(
      validBody({ summary: 'a'.repeat(150), description: 'b'.repeat(5000) }),
    )

    expect(lower.errors).toEqual([])
    expect(upper.errors).toEqual([])
  })

  it.each([
    ['summary', 'a'.repeat(4)],
    ['summary', 'a'.repeat(151)],
    ['description', 'a'.repeat(9)],
    ['description', 'a'.repeat(5001)],
  ])('rejects %s outside its documented length bounds', (field, value) => {
    const result = validateCreateTicketBody(validBody({ [field]: value }))

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    )
  })

  it('treats whitespace-only Summary and Description as empty', () => {
    const result = validateCreateTicketBody(
      validBody({ summary: '   ', description: '\t\n' }),
    )

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'summary' }),
        expect.objectContaining({ field: 'description' }),
      ]),
    )
    expect(result.value).toMatchObject({ summary: '', description: '' })
  })
})
