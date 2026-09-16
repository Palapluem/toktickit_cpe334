// L3-2 red phase. The seed roster and demo data, before any database exists.
// AC: role composition, Lab 2 identifier preservation (BR-40), status coverage.
import { describe, expect, it } from 'vitest'
import {
  DEVELOPMENT_PASSWORD,
  LAB2_REQUESTER_EMAILS,
  SEED_USERS,
  type SeedRole,
} from '../../src/seed/roster.js'
import {
  SEED_TICKETS,
  SEED_TICKET_BAND,
  type SeedTicketStatus,
} from '../../src/seed/demoTickets.js'

const ALL_STATUSES: SeedTicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
]

function usersOf(role: SeedRole, isActive: boolean) {
  return SEED_USERS.filter((u) => u.role === role && u.isActive === isActive)
}

describe('SEED-01 · the roster covers every role and activation state', () => {
  it('holds four active Requesters', () => {
    expect(usersOf('REQUESTER', true)).toHaveLength(4)
  })

  it('holds one inactive Requester, so BR-01 can be proved', () => {
    expect(usersOf('REQUESTER', false)).toHaveLength(1)
  })

  it('holds three active IT Staff', () => {
    expect(usersOf('IT_STAFF', true)).toHaveLength(3)
  })

  it('holds one inactive IT Staff, so BR-16 ownership can be proved', () => {
    expect(usersOf('IT_STAFF', false)).toHaveLength(1)
  })

  it('holds exactly one active Administrator and no inactive one', () => {
    expect(usersOf('ADMINISTRATOR', true)).toHaveLength(1)
    expect(usersOf('ADMINISTRATOR', false)).toHaveLength(0)
  })

  it('assigns every user exactly one of the three named roles (BR-11, BR-34)', () => {
    expect(SEED_USERS.length).toBeGreaterThan(0)
    for (const user of SEED_USERS) {
      expect(['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']).toContain(user.role)
    }
  })
})

describe('SEED-02 · emails are unique and comparable (BR-33)', () => {
  it('has no duplicate address', () => {
    const emails = SEED_USERS.map((u) => u.email)
    expect(emails.length).toBeGreaterThan(0)
    expect(new Set(emails).size).toBe(emails.length)
  })

  it('stores every address already lowercased, so the unique index is the rule', () => {
    expect(SEED_USERS.length).toBeGreaterThan(0)
    for (const user of SEED_USERS) {
      expect(user.email).toBe(user.email.toLowerCase())
    }
  })
})

describe('SEED-03 · the Lab 2 requesters survive the migration (BR-40)', () => {
  it('names all five Lab 2 requesters', () => {
    expect(LAB2_REQUESTER_EMAILS).toHaveLength(5)
  })

  it('carries each Lab 2 requester forward in the roster, so the upsert matches by email', () => {
    expect(LAB2_REQUESTER_EMAILS.length).toBeGreaterThan(0)
    const roster = new Set(SEED_USERS.map((u) => u.email))
    for (const email of LAB2_REQUESTER_EMAILS) {
      expect(roster).toContain(email)
    }
  })
})

describe('SEED-04 · the development password is a bridge, not a credential', () => {
  it('uses the test-only LAB3_SEED_PASSWORD environment value (SEC-033)', () => {
    expect(process.env.LAB3_SEED_PASSWORD).toBeDefined()
    expect(DEVELOPMENT_PASSWORD).toBe(process.env.LAB3_SEED_PASSWORD)
  })

  it('meets the length floor the server enforces (BR-05)', () => {
    expect(DEVELOPMENT_PASSWORD.length).toBeGreaterThanOrEqual(10)
  })
})

describe('SEED-05 · demo Tickets exercise the queue', () => {
  it('reaches every one of the eight statuses (BR-20)', () => {
    const seeded = new Set(SEED_TICKETS.map((t) => t.status))
    for (const status of ALL_STATUSES) {
      expect(seeded).toContain(status)
    }
  })

  it('includes both assigned and unassigned Tickets (BR-17)', () => {
    expect(SEED_TICKETS.some((t) => t.ownerEmail !== null)).toBe(true)
    expect(SEED_TICKETS.some((t) => t.ownerEmail === null)).toBe(true)
  })

  it('spreads across more than one priority', () => {
    expect(new Set(SEED_TICKETS.map((t) => t.requestedPriority)).size).toBeGreaterThan(1)
  })

  it('keeps every Ticket Number inside the reserved band, so runtime allocation cannot collide', () => {
    expect(SEED_TICKETS.length).toBeGreaterThan(0)
    for (const ticket of SEED_TICKETS) {
      const sequence = Number(ticket.ticketNo.split('-')[2])
      expect(sequence).toBeGreaterThan(SEED_TICKET_BAND)
    }
  })

  it('gives every Ticket Number the BR-04 shape', () => {
    expect(SEED_TICKETS.length).toBeGreaterThan(0)
    for (const ticket of SEED_TICKETS) {
      expect(ticket.ticketNo).toMatch(/^TKT-\d{4}-\d{6}$/)
    }
  })

  it('carries Public Comments and Internal Notes, each with an author (BR-30)', () => {
    const comments = SEED_TICKETS.flatMap((t) => t.comments)
    const notes = SEED_TICKETS.flatMap((t) => t.notes)
    expect(comments.length).toBeGreaterThan(0)
    expect(notes.length).toBeGreaterThan(0)
    for (const entry of [...comments, ...notes]) {
      expect(entry.authorEmail).not.toBe('')
      expect(entry.body.trim().length).toBeGreaterThan(0)
    }
  })

  it('gives every comment and note a distinct identifier, so the seed is idempotent', () => {
    const ids = SEED_TICKETS.flatMap((t) => [...t.comments, ...t.notes]).map((e) => e.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never lets a Requester-resolved Ticket sit in a terminal status (BR-23)', () => {
    const resolved = SEED_TICKETS.filter((t) => t.requesterResolved)
    expect(resolved.length).toBeGreaterThan(0)
    for (const ticket of resolved) {
      expect(['CLOSED', 'CANCELLED']).not.toContain(ticket.status)
    }
  })
})
