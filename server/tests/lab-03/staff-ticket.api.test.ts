// API-13…API-17, SEC-T10. AC-20…AC-24; api-spec.md §8.
// Every transition cell is exercised over the wire, not only in the unit test
// of the table: a correct table wired to the wrong role proves nothing.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import {
  TICKET_STATUSES,
  allowedTransitions,
  type TicketStatus,
} from '../../src/tickets/transitions.js'
import type { Role } from '../../src/auth/types.js'
import {
  ADMIN_EMAIL,
  INACTIVE_STAFF_EMAIL,
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  restoreSeededCredentials,
  signIn,
} from './auth-fixtures.js'

const TICKET_NO = 'TKT-2026-970001'

const cookies: Record<Role, string> = {
  REQUESTER: '',
  IT_STAFF: '',
  ADMINISTRATOR: '',
}

let ticketId = ''
let requesterId = ''
let staffId = ''
let adminId = ''
let inactiveStaffId = ''
let otherRequesterCookie = ''

async function idFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  })
  return user.id
}

async function makeTicket(status: TicketStatus = 'NEW', ownerId: string | null = null) {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirstOrThrow({ select: { id: true } }),
    prisma.relatedSystem.findFirstOrThrow({ select: { id: true } }),
  ])
  const ticket = await prisma.ticket.upsert({
    where: { ticketNo: TICKET_NO },
    update: { status, ownerId, itPriority: 'MEDIUM', requesterResolvedAt: null },
    create: {
      ticketNo: TICKET_NO,
      requesterId,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: 'Operations fixture',
      description: 'Created by staff-ticket.api.test.ts.',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      status,
      ownerId,
    },
    select: { id: true },
  })
  ticketId = ticket.id
  return ticket.id
}

const patch = (path: string, cookie: string, body: unknown) =>
  request(app).patch(path).set('Cookie', cookie).send(body)

beforeAll(async () => {
  cookies.REQUESTER = await signIn(REQUESTER_EMAIL)
  cookies.IT_STAFF = await signIn(STAFF_EMAIL)
  cookies.ADMINISTRATOR = await signIn(ADMIN_EMAIL)
  otherRequesterCookie = await signIn(OTHER_REQUESTER_EMAIL)
  requesterId = await idFor(REQUESTER_EMAIL)
  staffId = await idFor(STAFF_EMAIL)
  adminId = await idFor(ADMIN_EMAIL)
  inactiveStaffId = await idFor(INACTIVE_STAFF_EMAIL)
}, 60_000)

beforeEach(async () => {
  await makeTicket()
})

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { ticketNo: TICKET_NO } })
  await restoreSeededCredentials()
})

describe('API-13 · AC-20 · claiming and reassigning ownership', () => {
  it('claims an unassigned Ticket and moves NEW to OPEN in the same call (BR-24)', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.IT_STAFF,
      { ownerId: 'me' },
    )

    expect(response.status).toBe(200)
    expect(response.body.data.owner.id).toBe(staffId)
    // A claimed Ticket that is still NEW misrepresents the queue.
    expect(response.body.data.status).toBe('OPEN')
  })

  it('leaves a non-NEW status alone when the Ticket is claimed', async () => {
    await makeTicket('IN_PROGRESS')
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.IT_STAFF,
      { ownerId: 'me' },
    )

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('IN_PROGRESS')
  })

  it('reassigns an owned Ticket to another eligible user', async () => {
    await makeTicket('OPEN', staffId)
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.IT_STAFF,
      { ownerId: adminId },
    )

    expect(response.status).toBe(200)
    expect(response.body.data.owner.id).toBe(adminId)
  })

  it('unassigns on an explicit null', async () => {
    await makeTicket('OPEN', staffId)
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.IT_STAFF,
      { ownerId: null },
    )

    expect(response.status).toBe(200)
    expect(response.body.data.owner).toBeNull()
  })

  it('lets an Administrator own a Ticket (§11.8, BR-16)', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.ADMINISTRATOR,
      { ownerId: 'me' },
    )

    expect(response.status).toBe(200)
    expect(response.body.data.owner.id).toBe(adminId)
  })
})

describe('API-14 · AC-21 · only an active IT Staff or Administrator may own', () => {
  it('refuses an inactive IT Staff user', async () => {
    // The positive control: the active colleague is accepted.
    expect(
      (await patch(`/api/staff/tickets/${ticketId}/owner`, cookies.IT_STAFF, {
        ownerId: staffId,
      })).status,
    ).toBe(200)

    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.IT_STAFF,
      { ownerId: inactiveStaffId },
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('OWNER_NOT_ELIGIBLE')
  })

  it('refuses a Requester as an owner', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.IT_STAFF,
      { ownerId: requesterId },
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('OWNER_NOT_ELIGIBLE')
  })

  it('refuses a user that does not exist without saying so', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.IT_STAFF,
      { ownerId: '00000000-0000-4000-8000-000000000000' },
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('OWNER_NOT_ELIGIBLE')
  })

  it('refuses a Requester attempting to set an owner at all', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/owner`,
      cookies.REQUESTER,
      { ownerId: 'me' },
    )

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })
})

describe('API-15 · AC-22 · IT Priority moves, Requested Priority never does', () => {
  it('sets IT Priority and leaves Requested Priority untouched (BR-18)', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/it-priority`,
      cookies.IT_STAFF,
      { itPriority: 'URGENT' },
    )

    expect(response.status).toBe(200)
    expect(response.body.data.itPriority).toBe('URGENT')
    expect(response.body.data.requestedPriority).toBe('MEDIUM')
  })

  it('refuses a body naming requestedPriority rather than ignoring it', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/it-priority`,
      cookies.IT_STAFF,
      { itPriority: 'HIGH', requestedPriority: 'URGENT' },
    )

    expect(response.status).toBe(400)
    expect(response.body.error.fieldErrors.map((f: { field: string }) => f.field)).toContain(
      'requestedPriority',
    )

    const stored = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { requestedPriority: true, itPriority: true },
    })
    expect(stored.requestedPriority).toBe('MEDIUM')
    expect(stored.itPriority).toBe('MEDIUM')
  })

  it('refuses an unknown priority', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/it-priority`,
      cookies.IT_STAFF,
      { itPriority: 'CRITICAL' },
    )

    expect(response.status).toBe(400)
  })

  it('refuses a Requester', async () => {
    const response = await patch(
      `/api/staff/tickets/${ticketId}/it-priority`,
      cookies.REQUESTER,
      { itPriority: 'URGENT' },
    )

    expect(response.status).toBe(403)
  })
})

describe('API-16 · AC-23 · every transition cell, over the wire', () => {
  const ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

  for (const role of ROLES) {
    it(`lets ${role} make exactly the transitions §5.1 permits it`, async () => {
      for (const from of TICKET_STATUSES) {
        for (const to of allowedTransitions(role, from)) {
          await makeTicket(from)
          const response = await patch(
            `/api/staff/tickets/${ticketId}/status`,
            cookies[role],
            { status: to },
          )

          expect(response.status, `${role}: ${from} -> ${to}`).toBe(200)
          expect(response.body.data.status).toBe(to)
        }
      }
    }, 120_000)

    it(`refuses ${role} every transition §5.1 does not list`, async () => {
      // The positive control: this role can move something.
      expect(allowedTransitions(role, 'NEW').length).toBeGreaterThan(0)

      for (const from of TICKET_STATUSES) {
        const permitted = new Set(allowedTransitions(role, from))
        for (const to of TICKET_STATUSES) {
          if (permitted.has(to)) continue
          await makeTicket(from)
          const response = await patch(
            `/api/staff/tickets/${ticketId}/status`,
            cookies[role],
            { status: to },
          )

          expect([400, 403], `${role}: ${from} -> ${to}`).toContain(response.status)
          const stored = await prisma.ticket.findUniqueOrThrow({
            where: { id: ticketId },
            select: { status: true },
          })
          expect(stored.status, `${role}: ${from} -> ${to} changed the row`).toBe(from)
        }
      }
    }, 180_000)
  }

  it('answers 400 for a move no role may make, and 403 for one this role may not', async () => {
    await makeTicket('NEW')
    // Nobody may move NEW straight to CLOSED.
    const impossible = await patch(
      `/api/staff/tickets/${ticketId}/status`,
      cookies.IT_STAFF,
      { status: 'CLOSED' },
    )
    expect(impossible.status).toBe(400)
    expect(impossible.body.error.code).toBe('INVALID_STATUS_TRANSITION')

    await makeTicket('OPEN')
    // Staff may move OPEN to RESOLVED; a Requester may not.
    const forbidden = await patch(
      `/api/staff/tickets/${ticketId}/status`,
      cookies.REQUESTER,
      { status: 'RESOLVED' },
    )
    expect(forbidden.status).toBe(403)
    expect(forbidden.body.error.code).toBe('FORBIDDEN')
  })

  it('answers 404 for a Requester changing the status of a Ticket they do not own', async () => {
    // Reviewer finding, PR #62: a Requester's grant on this operation is
    // `own` (they may cancel or reopen their own Ticket), but the handler
    // never scoped the lookup by requesterId — so any signed-in Requester
    // could drive any other Requester's Ticket through this same endpoint,
    // with no UI needed to reach it.
    await makeTicket('NEW')
    const response = await patch(
      `/api/staff/tickets/${ticketId}/status`,
      otherRequesterCookie,
      { status: 'CANCELLED' },
    )
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('TICKET_NOT_FOUND')

    const stored = await prisma.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { status: true },
    })
    expect(stored.status).toBe('NEW')
  })

  it('discloses the permitted set, which is policy rather than data', async () => {
    await makeTicket('NEW')
    const response = await patch(
      `/api/staff/tickets/${ticketId}/status`,
      cookies.IT_STAFF,
      { status: 'CLOSED' },
    )

    expect(response.body.error.fieldErrors[0].message).toContain('OPEN')
  })

  it('clears the Requester resolution signal on reopen (BR-23)', async () => {
    await makeTicket('RESOLVED')
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { requesterResolvedAt: new Date() },
    })

    const response = await patch(
      `/api/staff/tickets/${ticketId}/status`,
      cookies.IT_STAFF,
      { status: 'REOPENED' },
    )

    expect(response.status).toBe(200)
    expect(response.body.data.requesterResolvedAt).toBeNull()
  })
})

describe('SEC-T10 · AC-24 · a Requester can never declare a problem solved', () => {
  it('refuses RESOLVED and CLOSED from every status, and changes nothing', async () => {
    for (const from of TICKET_STATUSES) {
      for (const to of ['RESOLVED', 'CLOSED'] as const) {
        await makeTicket(from)
        const response = await patch(
          `/api/staff/tickets/${ticketId}/status`,
          cookies.REQUESTER,
          { status: to },
        )

        expect([400, 403], `${from} -> ${to}`).toContain(response.status)
        const stored = await prisma.ticket.findUniqueOrThrow({
          where: { id: ticketId },
          select: { status: true },
        })
        expect(stored.status).toBe(from)
      }
    }
  }, 120_000)
})

describe('API-17 · the Requester resolution signal is a timestamp (§11.7)', () => {
  it('records it without changing the status', async () => {
    await makeTicket('IN_PROGRESS')
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/requester-resolution`)
      .set('Cookie', cookies.REQUESTER)
      .send({})

    expect(response.status).toBe(200)
    expect(response.body.data.requesterResolvedAt).toBeTruthy()
    // Echoed deliberately, so a client expecting a transition sees there was none.
    expect(response.body.data.status).toBe('IN_PROGRESS')
  })

  it('refuses IT Staff and Administrator — this is the Requester’s signal', async () => {
    await makeTicket('IN_PROGRESS')
    for (const role of ['IT_STAFF', 'ADMINISTRATOR'] as const) {
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/requester-resolution`)
        .set('Cookie', cookies[role])
        .send({})
      expect(response.status, role).toBe(403)
    }
  })

  it('answers 404 for another Requester’s Ticket (BR-14)', async () => {
    await makeTicket('IN_PROGRESS')
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/requester-resolution`)
      .set('Cookie', otherRequesterCookie)
      .send({})

    expect(response.status).toBe(404)
  })

  it('refuses with 409 once the Ticket is closed or cancelled', async () => {
    for (const status of ['CLOSED', 'CANCELLED'] as const) {
      await makeTicket(status)
      const response = await request(app)
        .post(`/api/tickets/${ticketId}/requester-resolution`)
        .set('Cookie', cookies.REQUESTER)
        .send({})
      expect(response.status, status).toBe(409)
    }
  })
})

describe('API-13 · the staff detail carries the policy the screen renders', () => {
  it('returns permittedTransitions for the calling role', async () => {
    await makeTicket('OPEN')
    const asStaff = await request(app)
      .get(`/api/staff/tickets/${ticketId}`)
      .set('Cookie', cookies.IT_STAFF)

    expect(asStaff.status).toBe(200)
    expect(asStaff.body.data.permittedTransitions.slice().sort()).toEqual(
      allowedTransitions('IT_STAFF', 'OPEN').slice().sort(),
    )
  })

  it('reads any Ticket, not only the caller’s own', async () => {
    const response = await request(app)
      .get(`/api/staff/tickets/${ticketId}`)
      .set('Cookie', cookies.IT_STAFF)

    expect(response.status).toBe(200)
    expect(response.body.data.requester.id).toBe(requesterId)
  })

  it('refuses a Requester', async () => {
    const response = await request(app)
      .get(`/api/staff/tickets/${ticketId}`)
      .set('Cookie', cookies.REQUESTER)

    // ticket:read grants a Requester `own`, so the role gate admits them and
    // the endpoint is the staff one — the refusal must still come.
    expect([403, 404]).toContain(response.status)
    expect(JSON.stringify(response.body)).not.toContain('Operations fixture')
  })
})
