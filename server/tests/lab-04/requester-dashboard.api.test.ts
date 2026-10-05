// DASH-07–DASH-10, SEC-03/05/07 · AC-02, AC-26–AC-30, AC-33 · api-spec §5–6.
// The SQL below is independently written; it does not reuse the application predicates.
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { hashPassword } from '../../src/auth/password.js'
import { DEVELOPMENT_PASSWORD } from '../../src/seed/roster.js'
import {
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  clearHistory,
  idFor,
  removeTickets,
  restoreSeededCredentials,
  signIn,
  ticketFactory,
} from './lab4-fixtures.js'

const BAND = 'TKT-2026-931'
const makeTicket = ticketFactory(BAND)
let requesterCookie = ''
let otherCookie = ''
let staffCookie = ''
let requesterId = ''
let otherId = ''
let noTicketCookie = ''
let noTicketUserId = ''
let noTicketEmail = ''

beforeAll(async () => {
  ;[requesterCookie, otherCookie, staffCookie] = await Promise.all([
    signIn(REQUESTER_EMAIL), signIn(OTHER_REQUESTER_EMAIL), signIn(STAFF_EMAIL),
  ])
  ;[requesterId, otherId] = await Promise.all([
    idFor(REQUESTER_EMAIL), idFor(OTHER_REQUESTER_EMAIL),
  ])
  noTicketEmail = `codex93-empty-${randomUUID()}@example.ac.th`
  const noTicketUser = await prisma.user.create({
    data: {
      displayName: 'Dashboard Empty Requester',
      email: noTicketEmail,
      passwordHash: await hashPassword(DEVELOPMENT_PASSWORD),
      role: 'REQUESTER',
      mustChangePassword: false,
    },
    select: { id: true },
  })
  noTicketUserId = noTicketUser.id
  noTicketCookie = await signIn(noTicketEmail)
}, 60_000)

beforeEach(async () => {
  await removeTickets(BAND)
})

afterAll(async () => {
  await removeTickets(BAND)
  await clearHistory()
  if (noTicketUserId) {
    await prisma.session.deleteMany({ where: { userId: noTicketUserId } })
    await prisma.user.delete({ where: { id: noTicketUserId } })
  }
  await restoreSeededCredentials()
})

async function sqlRequesterCounts(id: string) {
  const [counts] = await prisma.$queryRaw<Array<{
    total: bigint; open: bigint; attention: bigint; resolved: bigint; closed: bigint
  }>>`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE "status" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')) AS open,
      COUNT(*) FILTER (WHERE "status" = 'WAITING_FOR_REQUESTER') AS attention,
      COUNT(*) FILTER (WHERE "status" = 'RESOLVED') AS resolved,
      COUNT(*) FILTER (WHERE "status" = 'CLOSED') AS closed
    FROM "Ticket" WHERE "requesterId" = ${id}::uuid
  `
  return counts
}

describe('DASH-07 · AC-02/26 · MET-R01–R04 are independently counted and private', () => {
  it('matches SQL for the signed-in Requester and returns no other Requester data', async () => {
    await makeTicket({ requesterEmail: REQUESTER_EMAIL, status: 'REOPENED' })
    await makeTicket({ requesterEmail: REQUESTER_EMAIL, status: 'WAITING_FOR_REQUESTER' })
    const foreign = await makeTicket({ requesterEmail: OTHER_REQUESTER_EMAIL, status: 'OPEN' })
    await prisma.ticket.update({ where: { id: foreign }, data: { summary: 'FOREIGN-DASHBOARD-SENTINEL' } })

    const [response, expected] = await Promise.all([
      request(app).get('/api/requester/dashboard').set('Cookie', requesterCookie),
      sqlRequesterCounts(requesterId),
    ])
    expect(response.status).toBe(200)
    expect(response.body.data.totalTickets).toBe(Number(expected.total))
    expect(response.body.data.metrics).toMatchObject({
      open: { count: Number(expected.open), query: { statusGroup: 'active' } },
      needsAttention: { count: Number(expected.attention), query: { status: 'WAITING_FOR_REQUESTER' } },
      resolved: { count: Number(expected.resolved), query: { status: 'RESOLVED' } },
      closed: { count: Number(expected.closed), query: { status: 'CLOSED' } },
    })
    expect(JSON.stringify(response.body)).not.toContain('FOREIGN-DASHBOARD-SENTINEL')
    const allReturnedIds = response.body.data.recentlyUpdated.map((row: { id: string }) => row.id)
    const owners = await prisma.ticket.findMany({ where: { id: { in: allReturnedIds } }, select: { requesterId: true } })
    expect(owners.every((row) => row.requesterId === requesterId)).toBe(true)
  })
})

describe('DASH-08 · AC-27 · Requester metric drill-downs match their counts', () => {
  it('returns exactly the caller-owned records for each returned metric query', async () => {
    const openId = await makeTicket({ requesterEmail: REQUESTER_EMAIL, status: 'OPEN' })
    await makeTicket({ requesterEmail: REQUESTER_EMAIL, status: 'WAITING_FOR_REQUESTER' })
    const dashboard = await request(app).get('/api/requester/dashboard').set('Cookie', requesterCookie)
    expect(dashboard.status).toBe(200)
    const cases = [
      ['open', { requesterId, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] } }],
      ['needsAttention', { requesterId, status: 'WAITING_FOR_REQUESTER' }],
      ['resolved', { requesterId, status: 'RESOLVED' }],
      ['closed', { requesterId, status: 'CLOSED' }],
    ] as const
    for (const [name, where] of cases) {
      const metric = dashboard.body.data.metrics[name]
      const params = new URLSearchParams(metric.query)
      const rows = await request(app).get(`/api/tickets?${params}`).set('Cookie', requesterCookie)
      const expected = await prisma.ticket.findMany({ where, select: { id: true } })
      expect(rows.status, name).toBe(200)
      expect(rows.body.pagination.totalItems, name).toBe(metric.count)
      expect(rows.body.data.map((row: { id: string }) => row.id).sort(), name)
        .toEqual(expected.map((row) => row.id).sort())
    }
    expect(openId).toBeTruthy()
  })
})

describe('DASH-09 · AC-29 · first-use dashboard is genuinely empty', () => {
  it('returns zero totals, zero metrics and an empty recent list for a Requester with no Tickets', async () => {
    const response = await request(app).get('/api/requester/dashboard').set('Cookie', noTicketCookie)
    expect(response.status).toBe(200)
    expect(response.body.data.totalTickets).toBe(0)
    expect(Object.values(response.body.data.metrics).map((metric: any) => metric.count)).toEqual([0, 0, 0, 0])
    expect(response.body.data.recentlyUpdated).toEqual([])
  })
})

describe('DASH-10 · AC-33 · active group applies to both lists and rejects ambiguity', () => {
  it('echoes the group, returns only active rows, and rejects other or combined values', async () => {
    await makeTicket({ requesterEmail: REQUESTER_EMAIL, status: 'OPEN' })
    await makeTicket({ requesterEmail: REQUESTER_EMAIL, status: 'RESOLVED' })
    const requesterList = await request(app).get('/api/tickets?statusGroup=active').set('Cookie', requesterCookie)
    expect(requesterList.status).toBe(200)
    expect(requesterList.body.appliedFilters.statusGroup).toBe('active')
    expect(requesterList.body.data.every((row: { status: string }) =>
      ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].includes(row.status),
    )).toBe(true)
    const staffList = await request(app).get('/api/staff/tickets?statusGroup=active').set('Cookie', staffCookie)
    expect(staffList.status).toBe(200)
    expect(staffList.body.appliedFilters.statusGroup).toBe('active')
    expect(staffList.body.data.every((row: { status: string }) =>
      ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'].includes(row.status),
    )).toBe(true)
    for (const path of [
      '/api/tickets?statusGroup=active&status=OPEN',
      '/api/tickets?statusGroup=finished',
      '/api/staff/tickets?statusGroup=active&status=OPEN',
      '/api/staff/tickets?statusGroup=finished',
    ]) {
      const cookie = path.includes('/staff/') ? staffCookie : requesterCookie
      const invalid = await request(app).get(path).set('Cookie', cookie)
      expect(invalid.status, path).toBe(400)
      expect(invalid.body.error.code, path).toBe('VALIDATION_FAILED')
    }
  })
})

describe('SEC-03/05/07 · dashboard boundaries are enforced outside the UI', () => {
  it('refuses cross-role routes and scopes every Requester value to the caller', async () => {
    expect((await request(app).get('/api/requester/dashboard')).status).toBe(401)
    expect((await request(app).get('/api/requester/dashboard').set('Cookie', staffCookie)).status).toBe(403)
    expect((await request(app).get('/api/staff/dashboard').set('Cookie', requesterCookie)).status).toBe(403)
    expect((await request(app).get('/api/requester/dashboard').set('Cookie', otherCookie)).body.data.totalTickets)
      .toBe(Number((await sqlRequesterCounts(otherId)).total))
  })
})
