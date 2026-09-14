// API-11, API-12, SEC-T09. AC-18, AC-19; api-spec.md §8.
// The queue is the one list that is not user-scoped, so the refusal test is
// not a formality — it is the only thing between a Requester and every Ticket.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import {
  ADMIN_EMAIL,
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  restoreSeededCredentials,
  signIn,
} from './auth-fixtures.js'

const TICKET_PREFIX = 'TKT-2026-98'

let staffCookie = ''
let adminCookie = ''
let requesterCookie = ''
let staffId = ''
let categoryId = ''

async function idFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  })
  return user.id
}

type Seed = {
  no: string
  requesterEmail: string
  ownerEmail?: string
  summary: string
  itPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  createdAt: string
}

// Its own Tickets, so the assertions do not depend on what ran before.
const SEEDS: Seed[] = [
  {
    no: `${TICKET_PREFIX}0001`,
    requesterEmail: REQUESTER_EMAIL,
    summary: 'Queue alpha printer',
    itPriority: 'LOW',
    status: 'NEW',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    no: `${TICKET_PREFIX}0002`,
    requesterEmail: OTHER_REQUESTER_EMAIL,
    ownerEmail: STAFF_EMAIL,
    summary: 'Queue bravo network',
    itPriority: 'URGENT',
    status: 'IN_PROGRESS',
    createdAt: '2026-09-02T00:00:00.000Z',
  },
  {
    no: `${TICKET_PREFIX}0003`,
    requesterEmail: OTHER_REQUESTER_EMAIL,
    ownerEmail: ADMIN_EMAIL,
    summary: 'Queue charlie mailbox',
    itPriority: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-09-03T00:00:00.000Z',
  },
  {
    no: `${TICKET_PREFIX}0004`,
    requesterEmail: REQUESTER_EMAIL,
    summary: 'Queue delta laptop',
    itPriority: 'URGENT',
    status: 'RESOLVED',
    createdAt: '2026-08-30T00:00:00.000Z',
  },
]

async function seedQueue(): Promise<void> {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirstOrThrow({ select: { id: true } }),
    prisma.relatedSystem.findFirstOrThrow({ select: { id: true } }),
  ])
  categoryId = category.id

  for (const seed of SEEDS) {
    await prisma.ticket.upsert({
      where: { ticketNo: seed.no },
      update: {
        itPriority: seed.itPriority,
        status: seed.status,
        ownerId: seed.ownerEmail ? await idFor(seed.ownerEmail) : null,
      },
      create: {
        ticketNo: seed.no,
        requesterId: await idFor(seed.requesterEmail),
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: seed.summary,
        description: 'Seeded by staff-queue.api.test.ts.',
        requestedPriority: 'MEDIUM',
        itPriority: seed.itPriority,
        status: seed.status,
        ownerId: seed.ownerEmail ? await idFor(seed.ownerEmail) : null,
        createdAt: new Date(seed.createdAt),
      },
    })
  }
}

function queue(cookie: string, query: Record<string, string> = {}) {
  return request(app).get('/api/staff/tickets').set('Cookie', cookie).query(query)
}

/** Only the Tickets this file seeded, so other data cannot change an assertion. */
function mine(body: { data: { ticketNo: string }[] }): string[] {
  return body.data
    .map((row) => row.ticketNo)
    .filter((no) => no.startsWith(TICKET_PREFIX))
}

beforeAll(async () => {
  staffCookie = await signIn(STAFF_EMAIL)
  adminCookie = await signIn(ADMIN_EMAIL)
  requesterCookie = await signIn(REQUESTER_EMAIL)
  staffId = await idFor(STAFF_EMAIL)
}, 60_000)

beforeEach(async () => {
  await seedQueue()
})

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { ticketNo: { startsWith: TICKET_PREFIX } } })
  await restoreSeededCredentials()
})

describe('API-11 · AC-18 · the queue spans every Requester', () => {
  it('returns Tickets submitted by more than one person', async () => {
    const response = await queue(staffCookie, { pageSize: '50' })

    expect(response.status).toBe(200)
    const requesters = new Set(
      response.body.data.map((row: { requester: { id: string } }) => row.requester.id),
    )
    expect(requesters.size).toBeGreaterThan(1)
  })

  it('carries the fields the queue columns need', async () => {
    const response = await queue(staffCookie, { search: 'Queue bravo' })

    expect(response.status).toBe(200)
    expect(response.body.data[0]).toMatchObject({
      ticketNo: `${TICKET_PREFIX}0002`,
      summary: 'Queue bravo network',
      itPriority: 'URGENT',
      status: 'IN_PROGRESS',
      requester: { displayName: 'Michael Brown' },
      owner: { displayName: 'Patricia Evans' },
    })
  })

  it('answers an Administrator exactly as it answers IT Staff (§11.8)', async () => {
    const asStaff = await queue(staffCookie, { search: 'Queue', pageSize: '50' })
    const asAdmin = await queue(adminCookie, { search: 'Queue', pageSize: '50' })

    expect(asStaff.status).toBe(200)
    expect(mine(asAdmin.body)).toEqual(mine(asStaff.body))
  })
})

describe('API-12 · AC-19 · query composition', () => {
  it('orders by IT Priority descending, then oldest first, by default', async () => {
    const response = await queue(staffCookie, { search: 'Queue', pageSize: '50' })

    // delta and bravo are both URGENT; delta is older, so it leads.
    expect(mine(response.body)).toEqual([
      `${TICKET_PREFIX}0004`,
      `${TICKET_PREFIX}0002`,
      `${TICKET_PREFIX}0003`,
      `${TICKET_PREFIX}0001`,
    ])
  })

  it('matches the search case-insensitively on summary and ticket number', async () => {
    expect(mine((await queue(staffCookie, { search: 'CHARLIE' })).body)).toEqual([
      `${TICKET_PREFIX}0003`,
    ])
    expect(mine((await queue(staffCookie, { search: `${TICKET_PREFIX}0001` })).body)).toEqual([
      `${TICKET_PREFIX}0001`,
    ])
  })

  it('filters by status, IT priority, and category', async () => {
    expect(mine((await queue(staffCookie, { status: 'OPEN', pageSize: '50' })).body)).toEqual([
      `${TICKET_PREFIX}0003`,
    ])
    expect(
      mine((await queue(staffCookie, { itPriority: 'URGENT', pageSize: '50' })).body).sort(),
    ).toEqual([`${TICKET_PREFIX}0002`, `${TICKET_PREFIX}0004`])
    expect(
      mine((await queue(staffCookie, { categoryId, search: 'Queue', pageSize: '50' })).body)
        .length,
    ).toBe(4)
  })

  it('filters by owner: anyone, unassigned, me, and a named user', async () => {
    expect(
      mine((await queue(staffCookie, { ownerId: 'unassigned', pageSize: '50' })).body).sort(),
    ).toEqual([`${TICKET_PREFIX}0001`, `${TICKET_PREFIX}0004`])

    expect(mine((await queue(staffCookie, { ownerId: 'me', pageSize: '50' })).body)).toEqual([
      `${TICKET_PREFIX}0002`,
    ])

    // The same request from the Administrator resolves "me" to them, not to
    // whoever asked last.
    expect(mine((await queue(adminCookie, { ownerId: 'me', pageSize: '50' })).body)).toEqual([
      `${TICKET_PREFIX}0003`,
    ])

    expect(
      mine((await queue(staffCookie, { ownerId: staffId, pageSize: '50' })).body),
    ).toEqual([`${TICKET_PREFIX}0002`])
  })

  it('combines a filter with a sort and pagination', async () => {
    const response = await queue(staffCookie, {
      search: 'Queue',
      sort: 'ticketNo:asc',
      page: '2',
      pageSize: '2',
    })

    expect(response.status).toBe(200)
    expect(mine(response.body)).toEqual([`${TICKET_PREFIX}0003`, `${TICKET_PREFIX}0004`])
    expect(response.body.pagination).toMatchObject({
      page: 2,
      pageSize: 2,
      hasPreviousPage: true,
    })
  })

  it('echoes what it applied, including the owner filter', async () => {
    const response = await queue(staffCookie, { ownerId: 'me', status: 'IN_PROGRESS' })

    expect(response.body.appliedFilters).toMatchObject({
      ownerId: 'me',
      status: 'IN_PROGRESS',
      sort: 'itPriority:desc',
    })
  })

  it('sorts by lastActivityAt, which the schema stores as updatedAt', async () => {
    const response = await queue(staffCookie, {
      search: 'Queue',
      sort: 'lastActivityAt:desc',
      pageSize: '50',
    })

    expect(response.status).toBe(200)
    expect(mine(response.body)).toHaveLength(4)
  })
})

describe('API-12 · an invalid parameter is a failure, never a silent fallback', () => {
  const INVALID: Array<[string, Record<string, string>]> = [
    ['unknown sort field', { sort: 'summary:asc' }],
    ['unknown sort direction', { sort: 'itPriority:sideways' }],
    ['malformed sort', { sort: 'itPriority' }],
    ['unknown status', { status: 'PENDING_REQUESTER' }],
    ['unknown priority', { itPriority: 'CRITICAL' }],
    ['malformed categoryId', { categoryId: 'not-a-uuid' }],
    ['unknown categoryId', { categoryId: '00000000-0000-4000-8000-000000000000' }],
    ['malformed ownerId', { ownerId: 'somebody' }],
    ['page zero', { page: '0' }],
    ['page size over the maximum', { pageSize: '51' }],
    ['empty search', { search: '   ' }],
    ['a parameter that is not accepted', { relatedSystemId: 'x' }],
  ]

  for (const [name, query] of INVALID) {
    it(`refuses ${name} with 400`, async () => {
      const response = await queue(staffCookie, query)

      expect(response.status, name).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_FAILED')
      expect(response.body.error.fieldErrors.length).toBeGreaterThan(0)
    })
  }

  it('accepts the valid neighbours of those, so the refusals mean something', async () => {
    for (const query of [
      { sort: 'itPriority:asc' },
      { status: 'WAITING_FOR_REQUESTER' },
      { itPriority: 'URGENT' },
      { page: '1' },
      { pageSize: '50' },
    ]) {
      expect((await queue(staffCookie, query)).status, JSON.stringify(query)).toBe(200)
    }
  })
})

describe('SEC-T09 · AC-10 · a Requester never reaches the queue', () => {
  it('refuses with 403 and returns no Ticket data', async () => {
    // The positive control: staff do reach it.
    expect((await queue(staffCookie)).status).toBe(200)

    const response = await queue(requesterCookie)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
    expect(response.body).not.toHaveProperty('data')
    expect(JSON.stringify(response.body)).not.toContain(TICKET_PREFIX)
  })

  it('refuses an unauthenticated caller with 401', async () => {
    const response = await request(app).get('/api/staff/tickets')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
  })

  it('refuses a Requester before it validates anything, so nothing is disclosed', async () => {
    const response = await queue(requesterCookie, { sort: 'nonsense' })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})
