// API-11…API-17 (#21). AC-18…AC-24; BR-15, BR-16, BR-36…BR-41.
// TDT-01 partitions query values, TDT-02 checks pagination boundaries, and
// TDT-03 proves search, filters, sort, and pagination compose as one decision table.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { expectDataArray } from './envelope.js'
import { resetTicketData } from './ticket-fixtures.js'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type Status =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

type TicketOverrides = Partial<{
  ticketNo: string
  requesterId: string
  categoryId: string
  relatedSystemId: string
  summary: string
  requestedPriority: Priority
  itPriority: Priority
  status: Status
  createdAt: Date
  updatedAt: Date
}>

let requesterIds: string[] = []
let categoryIds: string[] = []
let relatedSystemIds: string[] = []
let ticketSequence = 100

beforeAll(async () => {
  const [requesters, categories, relatedSystems] = await Promise.all([
    prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      select: { id: true },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true } }),
    prisma.relatedSystem.findMany({
      orderBy: { name: 'asc' },
      select: { id: true },
    }),
  ])
  requesterIds = requesters.map(({ id }) => id)
  categoryIds = categories.map(({ id }) => id)
  relatedSystemIds = relatedSystems.map(({ id }) => id)
})

beforeEach(async () => {
  await resetTicketData()
  ticketSequence = 100
})

async function insertTicket(overrides: TicketOverrides = {}) {
  const createdAt =
    overrides.createdAt ??
    new Date(
      `2026-09-01T00:${String(ticketSequence - 100).padStart(2, '0')}:00.000Z`,
    )
  const ticket = await prisma.ticket.create({
    data: {
      ticketNo:
        overrides.ticketNo ??
        `TKT-2026-${String(ticketSequence++).padStart(6, '0')}`,
      requesterId: overrides.requesterId ?? requesterIds[0],
      categoryId: overrides.categoryId ?? categoryIds[0],
      relatedSystemId: overrides.relatedSystemId ?? relatedSystemIds[0],
      summary: overrides.summary ?? 'Ticket used by the My Tickets API test.',
      description: 'A sufficiently detailed description for the listing test.',
      requestedPriority: overrides.requestedPriority ?? 'MEDIUM',
      itPriority: overrides.itPriority ?? 'MEDIUM',
      status: overrides.status ?? 'NEW',
      ownerId: null,
      createdAt,
      updatedAt: overrides.updatedAt ?? createdAt,
    },
  })
  return ticket
}

async function addAttachment(
  ticketId: string,
  requesterId: string,
  removedAt: Date | null = null,
) {
  return prisma.attachment.create({
    data: {
      ticketId,
      originalFilename: removedAt ? 'removed.png' : 'active.png',
      storedFilename: `${ticketId}-${removedAt ? 'removed' : 'active'}.png`,
      mimeType: 'image/png',
      sizeBytes: 12,
      uploadedById: requesterId,
      removedAt,
      removedReason: removedAt ? 'No longer needed' : null,
      removedById: removedAt ? requesterId : null,
    },
  })
}

function listTickets(requesterId: string, query: Record<string, string> = {}) {
  return request(app)
    .get('/api/tickets')
    .set('X-Requester-Id', requesterId)
    .query(query)
}

describe('API-11/API-12 · AC-18/AC-19 · requester ownership', () => {
  it('returns only the current requester’s tickets', async () => {
    const own = await insertTicket({ requesterId: requesterIds[0] })
    await insertTicket({ requesterId: requesterIds[1] })

    const data = expectDataArray(await listTickets(requesterIds[0]))

    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ id: own.id, ticketNo: own.ticketNo })
  })

  it('does not reveal requester A tickets when requester B lists, searches, or pages', async () => {
    const own = await insertTicket({
      requesterId: requesterIds[0],
      summary: 'Requester A private ticket',
    })
    await insertTicket({ requesterId: requesterIds[1], summary: 'Requester B ticket' })

    const response = await listTickets(requesterIds[1], {
      search: own.ticketNo,
      page: '2',
      pageSize: '1',
    })

    expectDataArray(response)
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: own.id })]),
    )
    expect(response.body.pagination.totalItems).toBe(0)
  })
})

describe('API-13 · AC-20/BR-36 · ticket search', () => {
  it('matches ticket number and summary case-insensitively on partial text', async () => {
    const bySummary = await insertTicket({
      requesterId: requesterIds[0],
      ticketNo: 'TKT-2026-120001',
      summary: 'Campus printer is offline',
    })
    const byNumber = await insertTicket({
      requesterId: requesterIds[0],
      ticketNo: 'TKT-2026-120002',
      summary: 'Laptop battery drains quickly',
    })

    const summaryResults = expectDataArray(
      await listTickets(requesterIds[0], { search: 'PRINTER' }),
    )
    const numberResults = expectDataArray(
      await listTickets(requesterIds[0], { search: '120002' }),
    )

    expect(summaryResults.map((ticket) => (ticket as { id: string }).id)).toEqual([
      bySummary.id,
    ])
    expect(numberResults.map((ticket) => (ticket as { id: string }).id)).toEqual([
      byNumber.id,
    ])
  })
})

describe('API-14 · AC-21 · filters compose with AND', () => {
  it('filters category, related system, requested priority, IT priority, and status', async () => {
    const match = await insertTicket({
      requesterId: requesterIds[0],
      categoryId: categoryIds[0],
      relatedSystemId: relatedSystemIds[1],
      requestedPriority: 'HIGH',
      itPriority: 'URGENT',
      status: 'ASSIGNED',
      summary: 'Matches every filter',
    })
    await insertTicket({
      requesterId: requesterIds[0],
      categoryId: categoryIds[0],
      relatedSystemId: relatedSystemIds[1],
      requestedPriority: 'HIGH',
      itPriority: 'LOW',
      status: 'ASSIGNED',
      summary: 'Fails IT priority',
    })
    await insertTicket({
      requesterId: requesterIds[0],
      categoryId: categoryIds[1],
      relatedSystemId: relatedSystemIds[1],
      requestedPriority: 'HIGH',
      itPriority: 'URGENT',
      status: 'ASSIGNED',
      summary: 'Fails category',
    })

    const categoryResults = expectDataArray(
      await listTickets(requesterIds[0], { categoryId: categoryIds[0] }),
    )
    const systemResults = expectDataArray(
      await listTickets(requesterIds[0], { relatedSystemId: relatedSystemIds[1] }),
    )
    const requestedResults = expectDataArray(
      await listTickets(requesterIds[0], { requestedPriority: 'HIGH' }),
    )
    const itResults = expectDataArray(
      await listTickets(requesterIds[0], { itPriority: 'URGENT' }),
    )
    const statusResults = expectDataArray(
      await listTickets(requesterIds[0], { status: 'ASSIGNED' }),
    )
    const combinedResults = expectDataArray(
      await listTickets(requesterIds[0], {
        categoryId: categoryIds[0],
        relatedSystemId: relatedSystemIds[1],
        requestedPriority: 'HIGH',
        itPriority: 'URGENT',
        status: 'ASSIGNED',
      }),
    )

    expect(categoryResults).toHaveLength(2)
    expect(systemResults).toHaveLength(3)
    expect(requestedResults).toHaveLength(3)
    expect(itResults).toHaveLength(2)
    expect(statusResults).toHaveLength(3)
    expect(combinedResults).toEqual([
      expect.objectContaining({ id: match.id }),
    ])
  })
})

describe('API-15 · AC-22/BR-37/BR-38 · sorting', () => {
  it('uses the default newest-first order and a deterministic ticket-number tie-breaker', async () => {
    const createdAt = new Date('2026-09-01T12:00:00.000Z')
    await insertTicket({ requesterId: requesterIds[0], ticketNo: 'TKT-2026-000101', createdAt })
    await insertTicket({ requesterId: requesterIds[0], ticketNo: 'TKT-2026-000103', createdAt })
    await insertTicket({ requesterId: requesterIds[0], ticketNo: 'TKT-2026-000102', createdAt })

    const data = expectDataArray(await listTickets(requesterIds[0]))

    expect(data.map((ticket) => (ticket as { ticketNo: string }).ticketNo)).toEqual([
      'TKT-2026-000103',
      'TKT-2026-000102',
      'TKT-2026-000101',
    ])
  })

  it('sorts a whitelisted field in both directions', async () => {
    await insertTicket({ requesterId: requesterIds[0], summary: 'Beta' })
    await insertTicket({ requesterId: requesterIds[0], summary: 'Alpha' })
    await insertTicket({ requesterId: requesterIds[0], summary: 'Gamma' })

    const ascending = expectDataArray(
      await listTickets(requesterIds[0], { sort: 'summary:asc' }),
    )
    const descending = expectDataArray(
      await listTickets(requesterIds[0], { sort: 'summary:desc' }),
    )

    expect(ascending.map((ticket) => (ticket as { summary: string }).summary)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
    expect(descending.map((ticket) => (ticket as { summary: string }).summary)).toEqual([
      'Gamma',
      'Beta',
      'Alpha',
    ])
  })
})

describe('API-16 · AC-23/BR-40 · pagination', () => {
  it('returns slices, metadata, and an empty page beyond the last page', async () => {
    for (let index = 1; index <= 5; index += 1) {
      await insertTicket({ requesterId: requesterIds[0], summary: `Ticket ${index}` })
    }

    const secondPage = await listTickets(requesterIds[0], {
      page: '2',
      pageSize: '2',
    })
    const pastLastPage = await listTickets(requesterIds[0], {
      page: '4',
      pageSize: '2',
    })

    expect(expectDataArray(secondPage)).toHaveLength(2)
    expect(secondPage.body.pagination).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
    })
    expect(expectDataArray(pastLastPage)).toEqual([])
    expect(pastLastPage.body.pagination).toEqual({
      page: 4,
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: false,
    })
  })
})

describe('API-17 · AC-24/BR-38/BR-39 · invalid list queries', () => {
  it.each([
    ['page size above maximum', { pageSize: '51' }],
    ['page zero', { page: '0' }],
    ['unknown sort field', { sort: 'id:asc' }],
    ['unknown query parameter', { unexpected: 'value' }],
    ['invalid IT Priority', { itPriority: 'NOT_A_PRIORITY' }],
  ])('returns 400 for %s', async (_label, query) => {
    const response = await listTickets(requesterIds[0], query)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_FAILED')
  })

  it('rejects a valid UUID that does not identify an existing reference row', async () => {
    const response = await listTickets(requesterIds[0], {
      categoryId: '11111111-1111-4111-8111-111111111111',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'categoryId' }),
      ]),
    )
  })
})

describe('TC-018 · empty and no-results response states', () => {
  it('keeps an unfiltered empty list distinguishable from a filtered no-results list', async () => {
    const emptyResponse = await listTickets(requesterIds[0])
    const noResultsResponse = await listTickets(requesterIds[0], {
      search: 'nothing-matches',
    })

    expect(expectDataArray(emptyResponse)).toEqual([])
    expect(emptyResponse.body.appliedFilters.search).toBeNull()
    expect(expectDataArray(noResultsResponse)).toEqual([])
    expect(noResultsResponse.body.appliedFilters.search).toBe('nothing-matches')
  })
})

describe('list response shape · active attachment count', () => {
  it('returns the fields needed by My Tickets and counts only active attachments', async () => {
    const ticket = await insertTicket({ requesterId: requesterIds[0] })
    await addAttachment(ticket.id, requesterIds[0])
    await addAttachment(ticket.id, requesterIds[0], new Date('2026-09-01T13:00:00.000Z'))

    const data = expectDataArray(await listTickets(requesterIds[0]))

    expect(data[0]).toEqual(
      expect.objectContaining({
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        summary: ticket.summary,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        status: ticket.status,
        owner: null,
        activeAttachmentCount: 1,
      }),
    )
    expect(Object.keys(data[0] as object).sort()).toEqual([
      'activeAttachmentCount',
      'category',
      'createdAt',
      'id',
      'itPriority',
      'owner',
      'relatedSystem',
      'requestedPriority',
      'status',
      'summary',
      'ticketNo',
      'updatedAt',
    ])
  })
})
