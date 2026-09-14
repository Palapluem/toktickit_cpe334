// UNIT-04. The authorization matrix is a decision table, so every cell is a
// test (TDT-03). The expectation below is transcribed from specification.md
// §8.1 independently of the implementation — two transcriptions that must agree.
import { describe, expect, it } from 'vitest'
import {
  OPERATIONS,
  grantFor,
  may,
  type Grant,
  type Operation,
} from '../../src/auth/matrix.js'
import type { Role } from '../../src/auth/types.js'

const ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

const EXPECTED: Record<Operation, Record<Role, Grant>> = {
  'ticket:create': { REQUESTER: 'own', IT_STAFF: null, ADMINISTRATOR: null },
  'ticket:listOwn': { REQUESTER: 'own', IT_STAFF: null, ADMINISTRATOR: null },
  'ticket:read': { REQUESTER: 'own', IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'ticket:setStatus': { REQUESTER: 'own', IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'ticket:setOwner': { REQUESTER: null, IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'ticket:setItPriority': { REQUESTER: null, IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'ticket:requesterResolution': { REQUESTER: 'own', IT_STAFF: null, ADMINISTRATOR: null },
  'attachment:manage': { REQUESTER: 'own', IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'comment:read': { REQUESTER: 'own', IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'comment:create': { REQUESTER: 'own', IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'note:read': { REQUESTER: null, IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'note:create': { REQUESTER: null, IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'staffQueue:read': { REQUESTER: null, IT_STAFF: 'any', ADMINISTRATOR: 'any' },
  'user:list': { REQUESTER: null, IT_STAFF: null, ADMINISTRATOR: 'any' },
  'user:write': { REQUESTER: null, IT_STAFF: null, ADMINISTRATOR: 'any' },
  'user:setInitialPassword': { REQUESTER: null, IT_STAFF: null, ADMINISTRATOR: 'any' },
}

const EXPECTED_OPERATIONS = Object.keys(EXPECTED) as Operation[]

describe('UNIT-04 · the matrix lists every operation §8.1 names', () => {
  it('exposes all sixteen operations', () => {
    expect([...OPERATIONS].sort()).toEqual([...EXPECTED_OPERATIONS].sort())
  })
})

describe('UNIT-04 · every cell resolves as §8.1 states (TDT-03)', () => {
  for (const operation of EXPECTED_OPERATIONS) {
    for (const role of ROLES) {
      const expected = EXPECTED[operation][role]
      const label =
        expected === null ? 'refuses' : `grants ${expected} to`
      it(`${label} ${role} for ${operation}`, () => {
        expect(grantFor(role, operation)).toBe(expected)
      })
    }
  }
})

describe('UNIT-04 · an operation absent from the matrix is denied (BR-12, SEC-020)', () => {
  it('refuses an operation nobody declared', () => {
    // The positive control: a declared operation is granted.
    expect(may('ADMINISTRATOR', 'user:list')).toBe(true)

    for (const role of ROLES) {
      expect(grantFor(role, 'user:delete')).toBeNull()
      expect(grantFor(role, '')).toBeNull()
      expect(may(role, 'ticket:destroy')).toBe(false)
    }
  })

  it('refuses an operation name that only looks like a declared one', () => {
    expect(may('IT_STAFF', 'note:read')).toBe(true)
    expect(may('IT_STAFF', 'note:reader')).toBe(false)
    expect(may('IT_STAFF', 'NOTE:READ')).toBe(false)
  })
})

describe('UNIT-04 · the shape of the matrix carries the design', () => {
  it('never grants IT Staff any user-management operation', () => {
    // Conceptual separation is kept where it carries the security weight (§8.1).
    for (const operation of ['user:list', 'user:write', 'user:setInitialPassword'] as const) {
      expect(may('IT_STAFF', operation)).toBe(false)
      expect(may('ADMINISTRATOR', operation)).toBe(true)
    }
  })

  it('gives the Administrator every IT Staff ticket operation (§11.8)', () => {
    const staffOperations = EXPECTED_OPERATIONS.filter(
      (operation) => EXPECTED[operation].IT_STAFF !== null,
    )
    expect(staffOperations.length).toBeGreaterThan(0)
    for (const operation of staffOperations) {
      expect(grantFor('ADMINISTRATOR', operation)).toBe(grantFor('IT_STAFF', operation))
    }
  })

  it('scopes every Requester grant to their own records (SEC-018)', () => {
    const requesterOperations = EXPECTED_OPERATIONS.filter(
      (operation) => EXPECTED[operation].REQUESTER !== null,
    )
    expect(requesterOperations.length).toBeGreaterThan(0)
    for (const operation of requesterOperations) {
      expect(grantFor('REQUESTER', operation)).toBe('own')
    }
  })

  it('never lets a Requester reach Internal Notes (BR-27, SEC-021)', () => {
    // The positive control: the notes operations exist and staff hold them.
    expect(may('IT_STAFF', 'note:read')).toBe(true)
    expect(may('IT_STAFF', 'note:create')).toBe(true)

    expect(may('REQUESTER', 'note:read')).toBe(false)
    expect(may('REQUESTER', 'note:create')).toBe(false)
  })

  it('never lets a Requester reach the staff queue', () => {
    expect(may('IT_STAFF', 'staffQueue:read')).toBe(true)
    expect(may('REQUESTER', 'staffQueue:read')).toBe(false)
  })
})
