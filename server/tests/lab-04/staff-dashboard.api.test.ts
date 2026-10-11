// DASH-01–DASH-06, SEC-03/04 · AC-26–AC-31, AC-40 · api-spec §6.
// Dashboard counts are checked against independent SQL, never against seed constants.
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app, { createApp } from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { PrismaClient } from '../../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { getStaffDashboard } from '../../src/dashboard/dashboards.js'
import { hashPassword } from '../../src/auth/password.js'
import { DEVELOPMENT_PASSWORD } from '../../src/seed/roster.js'
import {
  ADMIN_EMAIL,
  DANIEL_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  clearHistory,
  idFor,
  removeTickets,
  restoreSeededCredentials,
  signIn,
  ticketFactory,
} from './lab4-fixtures.js'

const BAND = 'TKT-2026-930'
const makeTicket = ticketFactory(BAND)
const TERMINAL_URGENT_STATUSES = ['RESOLVED', 'CLOSED', 'CANCELLED'] as const
let staffCookie = ''
let requesterCookie = ''
let adminCookie = ''
let staffId = ''
let danielId = ''
let dashboardStaffId = ''
let dashboardStaffEmail = ''
let dashboardStaffCookie = ''

beforeAll(async () => {
  ;[staffCookie, requesterCookie, adminCookie] = await Promise.all([
    signIn(STAFF_EMAIL),
    signIn(REQUESTER_EMAIL),
    signIn(ADMIN_EMAIL),
  ])
  ;[staffId, danielId] = await Promise.all([idFor(STAFF_EMAIL), idFor(DANIEL_EMAIL)])
  dashboardStaffEmail = `codex93-dashboard-staff-${randomUUID()}@example.ac.th`
  const dashboardStaff = await prisma.user.create({
    data: {
      displayName: 'Dashboard Fixture Staff',
      email: dashboardStaffEmail,
      passwordHash: await hashPassword(DEVELOPMENT_PASSWORD),
      role: 'IT_STAFF',
      mustChangePassword: false,
    },
    select: { id: true },
  })
  dashboardStaffId = dashboardStaff.id
  dashboardStaffCookie = await signIn(dashboardStaffEmail)
}, 60_000)

beforeEach(async () => {
  await removeTickets(BAND)
})

afterAll(async () => {
  await removeTickets(BAND)
  await clearHistory()
  if (dashboardStaffId) {
    await prisma.session.deleteMany({ where: { userId: dashboardStaffId } })
    await prisma.user.delete({ where: { id: dashboardStaffId } })
  }
  await restoreSeededCredentials()
})

async function sqlStaffCounts() {
  const [counts] = await prisma.$queryRaw<Array<{
    unassigned: bigint
    assigned: bigint
    urgent: bigint
    waiting: bigint
  }>>`
    SELECT
      COUNT(*) FILTER (WHERE "ownerId" IS NULL AND "status" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')) AS unassigned,
      COUNT(*) FILTER (WHERE "ownerId" = ${staffId}::uuid AND "status" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')) AS assigned,
      COUNT(*) FILTER (WHERE "itPriority" = 'URGENT' AND "status" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')) AS urgent,
      COUNT(*) FILTER (WHERE "status" = 'WAITING_FOR_REQUESTER') AS waiting
    FROM "Ticket"
  `
  return counts
}

async function addTerminalUrgentTickets() {
  const ids: string[] = []
  for (const status of TERMINAL_URGENT_STATUSES) {
    const id = await makeTicket({ status })
    await prisma.ticket.update({ where: { id }, data: { itPriority: 'URGENT' } })
    ids.push(id)
  }
  return ids
}

describe('DASH-01 · AC-26 · MET-S01–S05 match independent SQL counts', () => {
  it('returns the metric totals and all eight status counts', async () => {
    await addTerminalUrgentTickets()
    const ticket = await makeTicket({ ownerEmail: STAFF_EMAIL })
    await prisma.ticket.update({ where: { id: ticket }, data: { itPriority: 'URGENT', status: 'REOPENED' } })
    await makeTicket({ ownerEmail: null, status: 'NEW' })

    const [response, expected, statusRows] = await Promise.all([
      request(app).get('/api/staff/dashboard').set('Cookie', staffCookie),
      sqlStaffCounts(),
      prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
        SELECT "status"::text AS status, COUNT(*) AS count FROM "Ticket" GROUP BY "status"`,
    ])
    expect(response.status).toBe(200)
    expect(response.body.data.metrics).toMatchObject({
      unassigned: { count: Number(expected.unassigned), query: { ownerId: 'unassigned', statusGroup: 'active' } },
      assignedToMe: { count: Number(expected.assigned), query: { ownerId: 'me', statusGroup: 'active' } },
      urgent: { count: Number(expected.urgent), query: { itPriority: 'URGENT', statusGroup: 'active' } },
      waitingForRequester: { count: Number(expected.waiting), query: { status: 'WAITING_FOR_REQUESTER' } },
    })
    const byStatus = response.body.data.byStatus as Array<{ status: string; count: number; query: object }>
    expect(byStatus.map((row) => row.status)).toEqual([
      'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED',
    ])
    const expectedByStatus = new Map(statusRows.map((row) => [row.status, Number(row.count)]))
    expect(byStatus.map((row) => row.count)).toEqual(
      ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']
        .map((status) => expectedByStatus.get(status) ?? 0),
    )
    for (const row of byStatus) expect(row.query).toEqual({ status: row.status })
  })
})

describe('DASH-02 · AC-27 · metric drill-downs reproduce their set', () => {
  it('returns exactly the SQL-matched Tickets for each staff metric query', async () => {
    const terminalUrgentIds = await addTerminalUrgentTickets()
    await makeTicket({ ownerEmail: null, status: 'NEW' })
    const owned = await makeTicket({ ownerEmail: STAFF_EMAIL, status: 'IN_PROGRESS' })
    await prisma.ticket.update({ where: { id: owned }, data: { itPriority: 'URGENT' } })

    const dashboard = await request(app).get('/api/staff/dashboard').set('Cookie', staffCookie)
    expect(dashboard.status).toBe(200)
    const cases = [
      ['unassigned', { ownerId: null, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } }],
      ['assignedToMe', { ownerId: staffId, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } }],
      ['urgent', { itPriority: 'URGENT', status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } }],
      ['waitingForRequester', { status: 'WAITING_FOR_REQUESTER' }],
    ] as const
    for (const [name, sqlWhere] of cases) {
      const metric = dashboard.body.data.metrics[name]
      const params = new URLSearchParams(metric.query)
      const rows = await request(app).get(`/api/staff/tickets?${params}`).set('Cookie', staffCookie)
      const expected = await prisma.ticket.findMany({ where: sqlWhere, select: { id: true } })
      expect(rows.status, name).toBe(200)
      expect(rows.body.pagination.totalItems, name).toBe(metric.count)
      expect(rows.body.data.map((row: { id: string }) => row.id).sort(), name)
        .toEqual(expected.map((row) => row.id).sort())
      if (name === 'urgent') {
        const ids = rows.body.data.map((row: { id: string }) => row.id)
        for (const id of terminalUrgentIds) expect(ids).not.toContain(id)
      }
    }
  })
})

describe('DASH-03 · AC-28 · open Actions are bounded, oldest first, and caller-assigned', () => {
  it('returns 12 fixture open Actions but only their 10 oldest, excluding terminal and other-assignee rows', async () => {
    const base = new Date('2020-01-01T00:00:00.000Z')
    const expectedOldest: string[] = []
    for (let index = 0; index < 12; index += 1) {
      const ticketId = await makeTicket({ ownerEmail: DANIEL_EMAIL })
      const action = await prisma.actionTaken.create({
        data: {
          ticketId,
          description: `Dashboard open action ${index}`,
          assigneeId: dashboardStaffId,
          performedById: danielId,
          requestId: randomUUID(),
          status: index % 2 ? 'IN_PROGRESS' : 'PLANNED',
          createdAt: new Date(base.getTime() + index * 60_000),
          updatedAt: new Date(base.getTime() + index * 60_000),
        },
      })
      expectedOldest.push(action.id)
    }
    const terminalTicket = await makeTicket()
    await prisma.actionTaken.create({ data: {
      ticketId: terminalTicket, description: 'Terminal row', assigneeId: dashboardStaffId,
      performedById: danielId, requestId: randomUUID(), status: 'COMPLETED',
      result: 'Done', completedById: danielId, completedAt: base,
    } })
    const otherTicket = await makeTicket()
    await prisma.actionTaken.create({ data: {
      ticketId: otherTicket, description: 'Another assignee', assigneeId: danielId,
      performedById: staffId, requestId: randomUUID(), status: 'PLANNED',
    } })

    const response = await request(app).get('/api/staff/dashboard').set('Cookie', dashboardStaffCookie)
    expect(response.status).toBe(200)
    expect(response.body.data.myOpenActions.total).toBe(12)
    expect(response.body.data.myOpenActions.items).toHaveLength(10)
    expect(response.body.data.myOpenActions.items.map((item: { actionId: string }) => item.actionId))
      .toEqual(expectedOldest.slice(0, 10))
  })
})

describe('DASH-04 · AC-29 · administrators receive the same complete zero-capable shape', () => {
  it('includes all status rows and a zero open-Action list for Margaret', async () => {
    const response = await request(app).get('/api/staff/dashboard').set('Cookie', adminCookie)
    expect(response.status).toBe(200)
    expect(response.body.data.byStatus).toHaveLength(8)
    expect(response.body.data.byStatus.map((row: { status: string }) => row.status)).toEqual([
      'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED',
    ])
    expect(response.body.data.myOpenActions).toEqual({ total: 0, items: [] })
    expect(response.body.data.metrics).toHaveProperty('unassigned.count')
  })

  it('zero-fills all eight status buckets when no status rows exist', async () => {
    const emptyDb = {
      $queryRaw: async () => [{ unassigned: 0n, assignedToMe: 0n, urgent: 0n, waitingForRequester: 0n }],
      ticket: { groupBy: async () => [], findMany: async () => [] },
      actionTaken: { count: async () => 0, findMany: async () => [] },
    } as unknown as PrismaClient
    const result = await getStaffDashboard(staffId, emptyDb)
    expect(result.byStatus).toHaveLength(8)
    expect(result.byStatus.every((row) => row.count === 0)).toBe(true)
    expect(result.recentlyUpdated).toEqual([])
    expect(result.myOpenActions).toEqual({ total: 0, items: [] })
  })
})

describe('DASH-05 · BR-38 · recent Tickets use updatedAt then id', () => {
  it('returns the five most recent in stable order when timestamps tie', async () => {
    const ids: string[] = []
    const recent = new Date('2099-10-01T00:00:00.000Z')
    for (let index = 0; index < 6; index += 1) {
      const id = await makeTicket({ ownerEmail: STAFF_EMAIL })
      ids.push(id)
      await prisma.ticket.update({ where: { id }, data: { updatedAt: new Date(recent.getTime() + (index < 2 ? 60_000 : 0)) } })
    }
    const expected = await prisma.ticket.findMany({
      where: { ticketNo: { startsWith: BAND } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 5, select: { id: true, updatedAt: true },
    })
    const response = await request(app).get('/api/staff/dashboard').set('Cookie', staffCookie)
    expect(response.status).toBe(200)
    expect(response.body.data.recentlyUpdated).toHaveLength(5)
    expect(response.body.data.recentlyUpdated.map((row: { id: string }) => row.id))
      .toEqual(expected.map((row) => row.id))
    expect(ids).toHaveLength(6)
  })
})

describe('DASH-06 · AC-40 · bounded lists and constant query count', () => {
  it('uses the same five data operations for 50 and 500 Tickets', async () => {
    const requesterId = await idFor(REQUESTER_EMAIL)
    const categoryId = (await prisma.category.findFirstOrThrow({ select: { id: true } })).id
    const relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow({ select: { id: true } })).id
    const createTickets = (start: number, count: number) => prisma.ticket.createMany({
      data: Array.from({ length: count }, (_, offset) => ({
        ticketNo: `${BAND}${String(start + offset).padStart(4, '0')}`,
        requesterId,
        categoryId,
        relatedSystemId,
        summary: `Dashboard query-count fixture ${start + offset}`,
        description: 'Synthetic data used only by the isolated test database.',
        requestedPriority: 'MEDIUM' as const,
        itPriority: 'MEDIUM' as const,
        status: 'OPEN' as const,
        ownerId: null,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, start + offset)),
        updatedAt: new Date(Date.UTC(2026, 0, 1, 0, start + offset)),
      })),
    })
    const measuredDb = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
      log: [{ level: 'query', emit: 'event' }],
    })
    let sqlQueryCount = 0
    measuredDb.$on('query', () => { sqlQueryCount += 1 })
    try {
      const measuredApp = createApp({ db: measuredDb })
      const runDashboard = async () => {
        sqlQueryCount = 0
        const response = await request(measuredApp).get('/api/staff/dashboard').set('Cookie', staffCookie)
        expect(response.status).toBe(200)
        expect(response.body.data.recentlyUpdated).toHaveLength(5)
        expect(response.body.data.myOpenActions.items.length).toBeLessThanOrEqual(10)
        return sqlQueryCount
      }

      await createTickets(1, 50)
      const atFifty = await runDashboard()
      await createTickets(51, 450)
      const atFiveHundred = await runDashboard()
      expect(atFifty).toBeGreaterThan(0)
      expect(atFiveHundred).toBe(atFifty)
    } finally {
      await measuredDb.$disconnect()
    }
  })
})

describe('SEC-03/04 · AC-30 · dashboard endpoints enforce session and role directly', () => {
  it('rejects unauthenticated and cross-role calls with the specified status', async () => {
    expect((await request(app).get('/api/staff/dashboard')).status).toBe(401)
    expect((await request(app).get('/api/requester/dashboard')).status).toBe(401)
    expect((await request(app).get('/api/staff/dashboard').set('Cookie', requesterCookie)).status).toBe(403)
    expect((await request(app).get('/api/requester/dashboard').set('Cookie', staffCookie)).status).toBe(403)
    expect((await request(app).get('/api/requester/dashboard').set('Cookie', adminCookie)).status).toBe(403)
  })
})
