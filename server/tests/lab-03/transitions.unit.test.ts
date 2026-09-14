// UNIT-03. The status transition matrix is a decision table, so every cell is
// a test (TDT-03, TDT-04). Transcribed from specification.md §5.1 independently
// of the implementation.
import { describe, expect, it } from 'vitest'
import {
  TICKET_STATUSES,
  allowedTransitions,
  mayTransition,
  type TicketStatus,
} from '../../src/tickets/transitions.js'
import type { Role } from '../../src/auth/types.js'

const ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

type Row = { REQUESTER: TicketStatus[]; STAFF: TicketStatus[] }

const EXPECTED: Record<TicketStatus, Row> = {
  NEW: {
    REQUESTER: ['CANCELLED'],
    STAFF: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  },
  OPEN: {
    REQUESTER: [],
    STAFF: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  },
  IN_PROGRESS: {
    REQUESTER: [],
    STAFF: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  },
  WAITING_FOR_REQUESTER: {
    REQUESTER: [],
    STAFF: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  },
  RESOLVED: {
    REQUESTER: ['REOPENED'],
    STAFF: ['CLOSED', 'REOPENED'],
  },
  CLOSED: {
    REQUESTER: [],
    STAFF: ['REOPENED'],
  },
  REOPENED: {
    REQUESTER: [],
    STAFF: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  },
  CANCELLED: {
    REQUESTER: [],
    STAFF: [],
  },
}

const expectedFor = (role: Role, from: TicketStatus): TicketStatus[] =>
  role === 'REQUESTER' ? EXPECTED[from].REQUESTER : EXPECTED[from].STAFF

describe('UNIT-03 · the eight statuses (BR-20)', () => {
  it('declares exactly the statuses §5.1 names', () => {
    expect([...TICKET_STATUSES].sort()).toEqual(
      (Object.keys(EXPECTED) as TicketStatus[]).sort(),
    )
  })
})

describe('UNIT-03 · every permitted transition is allowed (TDT-03)', () => {
  for (const role of ROLES) {
    for (const from of Object.keys(EXPECTED) as TicketStatus[]) {
      const permitted = expectedFor(role, from)
      if (permitted.length === 0) continue
      it(`lets ${role} move ${from} to ${permitted.join(', ')}`, () => {
        expect(allowedTransitions(role, from).slice().sort()).toEqual(
          permitted.slice().sort(),
        )
        for (const to of permitted) {
          expect(mayTransition(role, from, to)).toBe(true)
        }
      })
    }
  }
})

describe('UNIT-03 · every other transition is refused (BR-21)', () => {
  for (const role of ROLES) {
    it(`refuses ${role} every transition §5.1 does not list`, () => {
      // The positive control, read from the implementation rather than from the
      // expectation: a table that refuses everything cannot pass this test.
      expect(allowedTransitions(role, 'NEW').length).toBeGreaterThan(0)

      for (const from of Object.keys(EXPECTED) as TicketStatus[]) {
        const permitted = new Set(expectedFor(role, from))
        for (const to of Object.keys(EXPECTED) as TicketStatus[]) {
          if (permitted.has(to)) continue
          expect(
            mayTransition(role, from, to),
            `${role} must not move ${from} to ${to}`,
          ).toBe(false)
        }
      }
    })
  }
})

describe('UNIT-03 · the rules the matrix exists to enforce', () => {
  it('never lets a Requester declare a problem solved (BR-22)', () => {
    // The positive control: a Requester can move something.
    expect(mayTransition('REQUESTER', 'NEW', 'CANCELLED')).toBe(true)

    for (const from of Object.keys(EXPECTED) as TicketStatus[]) {
      expect(mayTransition('REQUESTER', from, 'RESOLVED')).toBe(false)
      expect(mayTransition('REQUESTER', from, 'CLOSED')).toBe(false)
    }
  })

  it('leaves CANCELLED terminal for everyone (BR-25)', () => {
    for (const role of ROLES) {
      // The positive control: this role can move something somewhere.
      expect(allowedTransitions(role, 'NEW').length).toBeGreaterThan(0)
      expect(allowedTransitions(role, 'CANCELLED')).toHaveLength(0)
    }
  })

  it('lets CLOSED move only to REOPENED, and only for staff (BR-25)', () => {
    expect(allowedTransitions('IT_STAFF', 'CLOSED')).toEqual(['REOPENED'])
    expect(allowedTransitions('ADMINISTRATOR', 'CLOSED')).toEqual(['REOPENED'])
    expect(allowedTransitions('REQUESTER', 'CLOSED')).toHaveLength(0)
  })

  it('lets a Requester reopen their own RESOLVED Ticket but not a CLOSED one (§11.6)', () => {
    expect(mayTransition('REQUESTER', 'RESOLVED', 'REOPENED')).toBe(true)
    expect(mayTransition('REQUESTER', 'CLOSED', 'REOPENED')).toBe(false)
  })

  it('gives the Administrator exactly the IT Staff transitions (§11.8)', () => {
    for (const from of Object.keys(EXPECTED) as TicketStatus[]) {
      expect(allowedTransitions('ADMINISTRATOR', from).slice().sort()).toEqual(
        allowedTransitions('IT_STAFF', from).slice().sort(),
      )
    }
  })

  it('leaves no status unreachable and no transition pointing nowhere', () => {
    const statuses = new Set<TicketStatus>(TICKET_STATUSES)
    const reachable = new Set<TicketStatus>(['NEW'])

    for (const role of ROLES) {
      for (const from of Object.keys(EXPECTED) as TicketStatus[]) {
        for (const to of allowedTransitions(role, from)) {
          expect(statuses, `${to} is not a declared status`).toContain(to)
          reachable.add(to)
        }
      }
    }

    for (const status of TICKET_STATUSES) {
      expect(reachable, `${status} can never be reached`).toContain(status)
    }
  })

  it('never lets a status transition to itself', () => {
    expect(mayTransition('IT_STAFF', 'NEW', 'OPEN')).toBe(true)

    for (const role of ROLES) {
      for (const status of TICKET_STATUSES) {
        expect(mayTransition(role, status, status)).toBe(false)
      }
    }
  })
})
