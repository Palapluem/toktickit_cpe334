// WF-01 to WF-17, SEC-02, SEC-03, SEC-06, SEC-07 · lab-04 AC-15 to AC-25, BR-19 to BR-33 — the Ticket workflow over HTTP.
// Expectations are written from specification §5.2 and api-spec §4, not read back from the implementation.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import app, { createApp } from '../../src/app.js'
import prisma from '../../src/prisma.js'
import type { TicketStatus } from '../../src/tickets/transitions.js'
import type { Role } from '../../src/auth/types.js'
import {
  ADMIN_EMAIL,
  DANIEL_EMAIL,
  OLIVIA_EMAIL,
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  clearHistory,
  holdTicketLock,
  idFor,
  removeTickets,
  restoreSeededCredentials,
  signIn,
  ticketFactory,
  waitUntilBlocked,
} from './lab4-fixtures.js'
import { STATUSES, edgesFor } from './transition-oracle.js'

const BAND = 'TKT-2026-94'
const makeTicket = ticketFactory(BAND)

let patricia = ''
let daniel = ''
let olivia = ''
let margaret = ''
let jennifer = ''
let michael = ''
const id: Record<string, string> = {}
let cookies: Record<Role, string>

const setStatus = (ticketId: string, cookie: string, body: unknown) =>
  request(app).patch(`/api/staff/tickets/${ticketId}/status`).set('Cookie', cookie).send(body as object)
const setOwner = (ticketId: string, cookie: string, body: unknown) =>
  request(app).patch(`/api/staff/tickets/${ticketId}/owner`).set('Cookie', cookie).send(body as object)
const setPriority = (ticketId: string, cookie: string, body: unknown) =>
  request(app).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', cookie).send(body as object)
const history = (ticketId: string, cookie?: string) => {
  const call = request(app).get(`/api/tickets/${ticketId}/history`)
  return cookie ? call.set('Cookie', cookie) : call
}
const staffDetail = (ticketId: string, cookie: string) =>
  request(app).get(`/api/staff/tickets/${ticketId}`).set('Cookie', cookie)
const requesterDetail = (ticketId: string, cookie: string) =>
  request(app).get(`/api/tickets/${ticketId}`).set('Cookie', cookie)
const createAction = (ticketId: string, cookie: string, assigneeId: string, over: Record<string, unknown> = {}) =>
  request(app)
    .post(`/api/tickets/${ticketId}/actions`)
    .set('Cookie', cookie)
    .send({ requestId: randomUUID(), description: 'Collect the relay error from the mail gateway log.', assigneeId, ...over })
const editAction = (ticketId: string, actionId: string, cookie: string, body: unknown) =>
  request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}`).set('Cookie', cookie).send(body as object)
const moveAction = (ticketId: string, actionId: string, cookie: string, body: unknown) =>
  request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}/status`).set('Cookie', cookie).send(body as object)

/** The `data` of a read that must have succeeded, so a missing route fails here and not on a later `.map`. */
async function dataOf(call: Promise<request.Response>): Promise<any[]> {
  const response = await call
  expect(response.status, response.text.slice(0, 120)).toBe(200)
  return response.body.data
}

const row = (ticketId: string) => prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })
const version = async (ticketId: string) => (await row(ticketId)).version
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** An Action written straight into the database, so a test can set up a state the API would not allow. */
const insertAction = (ticketId: string, over: Record<string, unknown> = {}) =>
  prisma.actionTaken.create({
    data: {
      ticketId,
      requestId: randomUUID(),
      description: 'Fixture Action',
      status: 'PLANNED',
      assigneeId: id.olivia,
      performedById: id.patricia,
      ...over,
    } as never,
  })

const eventsOf = (ticketId: string) =>
  prisma.ticketEvent.findMany({ where: { ticketId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })

beforeAll(async () => {
  ;[patricia, daniel, olivia, margaret, jennifer, michael] = await Promise.all([
    signIn(STAFF_EMAIL),
    signIn(DANIEL_EMAIL),
    signIn(OLIVIA_EMAIL),
    signIn(ADMIN_EMAIL),
    signIn(REQUESTER_EMAIL),
    signIn(OTHER_REQUESTER_EMAIL),
  ])
  cookies = { REQUESTER: jennifer, IT_STAFF: patricia, ADMINISTRATOR: margaret }
  id.patricia = await idFor(STAFF_EMAIL)
  id.daniel = await idFor(DANIEL_EMAIL)
  id.olivia = await idFor(OLIVIA_EMAIL)
  id.margaret = await idFor(ADMIN_EMAIL)
  id.jennifer = await idFor(REQUESTER_EMAIL)
}, 60_000)

afterAll(async () => {
  await removeTickets(BAND)
  await restoreSeededCredentials()
})

describe('WF-01 · AC-15 · BR-20 · RESOLVED is refused while an Action is open', () => {
  it('answers 409 with the open count for a PLANNED Action, then for an IN_PROGRESS one, and changes nothing', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const action = (await createAction(ticketId, patricia, id.olivia)).body.data as { id: string; version: number }

    const planned = await setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 })
    expect(planned.status).toBe(409)
    expect(planned.body.error.code).toBe('OPEN_ACTIONS_BLOCK_RESOLUTION')
    expect(planned.body.error.details).toMatchObject({ openActionCount: 1 })

    await moveAction(ticketId, action.id, olivia, { expectedVersion: action.version, status: 'IN_PROGRESS' })
    await createAction(ticketId, patricia, id.daniel)
    const started = await setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 })
    expect(started.status).toBe(409)
    expect(started.body.error.details).toMatchObject({ openActionCount: 2 })

    const stored = await row(ticketId)
    expect(stored.status).toBe('IN_PROGRESS')
    expect(stored.version).toBe(1)
    expect((await eventsOf(ticketId)).map((e) => e.type)).not.toContain('STATUS_CHANGED')
  })

  it('refuses the Administrator the same way, and never lets a Requester reach the gate at all', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    await insertAction(ticketId)

    const admin = await setStatus(ticketId, margaret, { status: 'RESOLVED', expectedVersion: 1 })
    expect(admin.status).toBe(409)
    expect(admin.body.error.code).toBe('OPEN_ACTIONS_BLOCK_RESOLUTION')

    // The transition is judged before the gate: a Requester is forbidden, not told about Actions (lab-03 BR-22).
    const requester = await setStatus(ticketId, jennifer, { status: 'RESOLVED', expectedVersion: 1 })
    expect(requester.status).toBe(403)
    expect(requester.body.error.code).toBe('FORBIDDEN')
    expect((await row(ticketId)).status).toBe('IN_PROGRESS')
  })
})

describe('WF-02 · AC-15 · BR-20 · CLOSED holds against data written outside the application', () => {
  it('answers 409 for CLOSED on a RESOLVED Ticket that holds an open Action inserted into the database', async () => {
    const ticketId = await makeTicket({ status: 'RESOLVED', ownerEmail: DANIEL_EMAIL })
    await insertAction(ticketId, { status: 'IN_PROGRESS' })

    const response = await setStatus(ticketId, patricia, { status: 'CLOSED', expectedVersion: 1 })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('OPEN_ACTIONS_BLOCK_RESOLUTION')
    expect(response.body.error.details).toMatchObject({ openActionCount: 1 })
    expect((await row(ticketId)).status).toBe('RESOLVED')
  })

  it('lets the same Ticket close once the Action is finished (positive control)', async () => {
    const ticketId = await makeTicket({ status: 'RESOLVED', ownerEmail: DANIEL_EMAIL })
    await insertAction(ticketId, { status: 'COMPLETED', result: 'Done', completedById: id.olivia, completedAt: new Date() })

    expect((await setStatus(ticketId, patricia, { status: 'CLOSED', expectedVersion: 1 })).status).toBe(200)
  })
})

describe('WF-03 · AC-16 · resolving when every Action is finished', () => {
  it('resolves, bumps the version, and writes one STATUS_CHANGED event', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    await insertAction(ticketId, { status: 'COMPLETED', result: 'Done', completedById: id.olivia, completedAt: new Date() })
    await insertAction(ticketId, { status: 'CANCELLED', cancellationReason: 'Not needed', cancelledById: id.olivia, cancelledAt: new Date() })

    const response = await setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ id: ticketId, status: 'RESOLVED', version: 2, cancelledActionCount: 0 })
    expect(response.body.data.permittedTransitions).toEqual(['CLOSED', 'REOPENED'])
    const events = await eventsOf(ticketId)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'STATUS_CHANGED', actorId: id.patricia, payload: { from: 'IN_PROGRESS', to: 'RESOLVED' } })
  })
})

describe('WF-04 · AC-16 · BR-21 · Tickets with no Actions can be resolved', () => {
  it('resolves a Ticket that never had an Action', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    const response = await setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 })
    expect(response.status).toBe(200)
    expect((await row(ticketId)).status).toBe('RESOLVED')
  })

  it('resolves a seeded Lab 3 Ticket, then puts it back as it was', { timeout: 120_000 }, async () => {
    // Earlier test files empty the Ticket table, so the demonstration data is seeded afresh for this one.
    execFileSync('npm', ['run', 'db:seed'], { stdio: 'pipe', shell: process.platform === 'win32', env: { ...process.env } })
    const seeded = await prisma.ticket.findUniqueOrThrow({ where: { ticketNo: 'TKT-2026-900005' } })
    expect(seeded.status, 'the seeded Ticket this test borrows').toBe('WAITING_FOR_REQUESTER')
    expect(await prisma.actionTaken.count({ where: { ticketId: seeded.id } })).toBe(0)
    try {
      const response = await setStatus(seeded.id, patricia, { status: 'RESOLVED', expectedVersion: seeded.version })
      expect(response.status).toBe(200)
      expect(response.body.data.status).toBe('RESOLVED')
    } finally {
      await clearHistory()
      await prisma.ticket.update({
        where: { id: seeded.id },
        data: { status: seeded.status, version: seeded.version, updatedAt: seeded.updatedAt, requesterResolvedAt: seeded.requesterResolvedAt },
      })
    }
  })
})

describe('WF-05 · AC-17 · BR-22 · cancelling a Ticket cancels its open Actions', () => {
  const at = (offset: number) => new Date(Date.parse('2026-10-04T01:00:00Z') + offset)

  async function ticketWithThreeActions(status: TicketStatus = 'IN_PROGRESS', requesterEmail = REQUESTER_EMAIL) {
    const ticketId = await makeTicket({ status, ownerEmail: DANIEL_EMAIL, requesterEmail })
    // Written newest first, so the order the rows were stored in is the wrong answer for the cascade.
    const started = await insertAction(ticketId, { status: 'IN_PROGRESS', createdAt: at(2_000) })
    const planned = await insertAction(ticketId, { status: 'PLANNED', createdAt: at(1_000) })
    const done = await insertAction(ticketId, {
      status: 'COMPLETED',
      result: 'Done',
      completedById: id.olivia,
      completedAt: at(3_000),
      createdAt: at(500),
    })
    return { ticketId, planned, started, done }
  }

  it('cancels both open Actions with the system reason and the caller, leaves the completed one alone', async () => {
    const { ticketId, planned, started, done } = await ticketWithThreeActions()
    const before = Date.now()

    const response = await setStatus(ticketId, patricia, { status: 'CANCELLED', expectedVersion: 1 })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ status: 'CANCELLED', version: 2, cancelledActionCount: 2, permittedTransitions: [] })
    for (const action of [planned, started]) {
      const stored = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })
      expect(stored).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Ticket cancelled', cancelledById: id.patricia, version: 2 })
      expect(stored.cancelledAt!.getTime()).toBeGreaterThanOrEqual(before - 5_000)
    }
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: done.id } })).toMatchObject({ status: 'COMPLETED', version: 1, cancelledById: null })

    const events = await eventsOf(ticketId)
    expect(events.map((e) => e.type)).toEqual(['STATUS_CHANGED', 'ACTION_CANCELLED', 'ACTION_CANCELLED'])
    expect(events[0].payload).toEqual({ from: 'IN_PROGRESS', to: 'CANCELLED', cascadedActionCount: 2 })
    expect(events.slice(1).map((e) => e.actionId)).toEqual([planned.id, started.id])
    expect(events.slice(1).map((e) => e.payload)).toEqual([
      { from: 'PLANNED', to: 'CANCELLED', cascade: true },
      { from: 'IN_PROGRESS', to: 'CANCELLED', cascade: true },
    ])
  })

  it('attributes a Requester cancelling their own NEW Ticket to the Requester', async () => {
    const { ticketId, planned } = await ticketWithThreeActions('NEW')
    const response = await setStatus(ticketId, jennifer, { status: 'CANCELLED', expectedVersion: 1 })

    expect(response.status).toBe(200)
    expect(response.body.data.cancelledActionCount).toBe(2)
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: planned.id } })).toMatchObject({
      status: 'CANCELLED',
      cancelledById: id.jennifer,
      cancellationReason: 'Ticket cancelled',
    })
  })

  it('persists nothing when the history cannot be written after the cascade', async () => {
    const { ticketId, planned, started } = await ticketWithThreeActions()
    const broken = new Proxy(prisma, {
      get(target, property, receiver) {
        if (property !== '$transaction') return Reflect.get(target, property, receiver)
        return (run: (tx: unknown) => unknown, options?: unknown) =>
          target.$transaction(
            (tx) =>
              run(
                new Proxy(tx, {
                  get(inner, key, r) {
                    if (key !== 'ticketEvent') return Reflect.get(inner, key, r)
                    return {
                      create: async (args: { data: { type: string } }) => {
                        if (args.data.type === 'ACTION_CANCELLED') throw new Error('history store unavailable')
                        return inner.ticketEvent.create(args as never)
                      },
                    }
                  },
                }),
              ) as Promise<unknown>,
            options as never,
          )
      },
    })

    const response = await request(createApp({ db: broken }))
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set('Cookie', patricia)
      .send({ status: 'CANCELLED', expectedVersion: 1 })

    expect(response.status).toBe(500)
    expect(await row(ticketId)).toMatchObject({ status: 'IN_PROGRESS', version: 1 })
    for (const action of [planned, started]) {
      expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).toMatchObject({ status: expect.stringMatching(/PLANNED|IN_PROGRESS/), version: 1, cancelledById: null })
    }
    expect(await prisma.ticketEvent.count({ where: { ticketId } })).toBe(0)
  })
})

describe('WF-06 · AC-18 · BR-19 · every §5.2 cell, for every role', () => {
  for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as Role[]) {
    it(`lets ${role} make each permitted move and refuses every other, on a Ticket with no open Action`, async () => {
      let moved = 0
      let refused = 0
      for (const from of STATUSES) {
        const permitted = new Set(edgesFor(role, from))
        for (const to of STATUSES) {
          const ticketId = await makeTicket({ status: from, ownerEmail: DANIEL_EMAIL })
          const response = await setStatus(ticketId, cookies[role], { status: to, expectedVersion: 1 })
          const label = `${role}: ${from} -> ${to}`
          if (permitted.has(to)) {
            expect(response.status, label).toBe(200)
            expect(await row(ticketId), label).toMatchObject({ status: to, version: 2 })
            moved += 1
          } else {
            expect([400, 403], label).toContain(response.status)
            expect(await row(ticketId), label).toMatchObject({ status: from, version: 1 })
            refused += 1
          }
        }
      }
      expect(moved, 'the role can move something').toBeGreaterThan(0)
      expect(refused, 'and is refused something').toBeGreaterThan(0)
    }, 240_000)
  }

  it('offers the gate-aware set on the Ticket detail, and explains what it left out (AC-18)', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    await insertAction(ticketId)
    await insertAction(ticketId, { status: 'IN_PROGRESS' })
    await insertAction(ticketId, { status: 'COMPLETED', result: 'Done', completedById: id.olivia, completedAt: new Date() })

    const blocked = await staffDetail(ticketId, patricia)
    expect(blocked.status).toBe(200)
    expect(blocked.body.data).toMatchObject({ version: 1, openActionCount: 2, permittedTransitions: ['WAITING_FOR_REQUESTER', 'CANCELLED'] })
    expect(blocked.body.data.blockedTransitions).toEqual([{ status: 'RESOLVED', reason: 'OPEN_ACTIONS', openActionCount: 2 }])

    const requester = await requesterDetail(ticketId, jennifer)
    expect(requester.body.data).toMatchObject({ version: 1, openActionCount: 2 })
    expect(requester.body.data).not.toHaveProperty('blockedTransitions')

    const clear = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const open = await staffDetail(clear, patricia)
    expect(open.body.data.permittedTransitions).toContain('RESOLVED')
    expect(open.body.data).toMatchObject({ openActionCount: 0, blockedTransitions: [] })
  })
})

describe('WF-07 · AC-19 · BR-31 · a stale status change is refused and the newer change is kept', () => {
  it('refuses the version read before an owner change, keeps the owner, and names the current version', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: null })
    const seen = (await staffDetail(ticketId, patricia)).body.data.version as number
    expect((await setOwner(ticketId, daniel, { ownerId: id.daniel })).status).toBe(200)

    const stale = await setStatus(ticketId, patricia, { status: 'IN_PROGRESS', expectedVersion: seen })

    expect(stale.status).toBe(409)
    expect(stale.body.error.code).toBe('STALE_VERSION')
    expect(stale.body.error.details).toMatchObject({ currentVersion: seen + 1, currentStatus: 'OPEN' })
    expect(await row(ticketId)).toMatchObject({ status: 'OPEN', ownerId: id.daniel, version: seen + 1 })
  })

  it('treats an IT Priority change, a Requester indication and another status change as newer too', async () => {
    const priority = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    await setPriority(priority, patricia, { itPriority: 'URGENT' })
    expect((await setStatus(priority, patricia, { status: 'IN_PROGRESS', expectedVersion: 1 })).body.error.code).toBe('STALE_VERSION')

    const indicated = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    await request(app).post(`/api/tickets/${indicated}/requester-resolution`).set('Cookie', jennifer).send({})
    expect((await setStatus(indicated, patricia, { status: 'IN_PROGRESS', expectedVersion: 1 })).body.error.code).toBe('STALE_VERSION')

    const twice = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    expect((await setStatus(twice, patricia, { status: 'IN_PROGRESS', expectedVersion: 1 })).status).toBe(200)
    const loser = await setStatus(twice, margaret, { status: 'WAITING_FOR_REQUESTER', expectedVersion: 1 })
    expect(loser.status).toBe(409)
    expect(loser.body.error.details).toMatchObject({ currentVersion: 2, currentStatus: 'IN_PROGRESS' })
    expect((await row(twice)).status).toBe('IN_PROGRESS')
  })

  it('judges the version before the move, and accepts the current one (positive control)', async () => {
    const ticketId = await makeTicket({ status: 'NEW', ownerEmail: null })
    await setPriority(ticketId, patricia, { itPriority: 'LOW' })
    const impossibleButStale = await setStatus(ticketId, patricia, { status: 'CLOSED', expectedVersion: 1 })
    expect(impossibleButStale.status).toBe(409)
    expect(impossibleButStale.body.error.code).toBe('STALE_VERSION')

    const current = await setStatus(ticketId, patricia, { status: 'OPEN', expectedVersion: 2 })
    expect(current.status).toBe(200)
  })
})

describe('WF-08 · AC-20 · BR-33 · creating an Action and resolving at the same moment', () => {
  it('never leaves a resolved Ticket holding open work, over 20 simultaneous pairs', async () => {
    const outcomes: string[] = []
    for (let round = 0; round < 20; round += 1) {
      const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
      const [resolve, create] = await Promise.all([
        setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 }),
        createAction(ticketId, margaret, id.olivia),
      ])

      const stored = await row(ticketId)
      const open = await prisma.actionTaken.count({ where: { ticketId, status: { in: ['PLANNED', 'IN_PROGRESS'] } } })
      expect(stored.status === 'RESOLVED' && open > 0, `round ${round}: resolved with ${open} open`).toBe(false)

      if (resolve.status === 200) {
        expect(create.status, `round ${round}`).toBe(409)
        expect(create.body.error.code).toBe('TICKET_NOT_WORKABLE')
        outcomes.push('resolved first')
      } else {
        expect(resolve.status, `round ${round}`).toBe(409)
        expect(resolve.body.error.code).toBe('OPEN_ACTIONS_BLOCK_RESOLUTION')
        expect(create.status).toBe(201)
        outcomes.push('action first')
      }
    }
    expect(outcomes).toHaveLength(20)
  }, 120_000)

  it('makes the status change wait for the Ticket row lock, and finish once it is released', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const lock = holdTicketLock(ticketId)
    await lock.acquired

    let finished = false
    const pending = setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 }).then((response) => {
      finished = true
      return response
    })
    await waitUntilBlocked()
    expect(finished).toBe(false)
    expect((await row(ticketId)).status).toBe('IN_PROGRESS')

    lock.release()
    await lock.done
    expect((await pending).status).toBe(200)
  })

  it('reads the version only after the lock, so a change the holder committed makes it stale (BR-31, BR-33)', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const lock = holdTicketLock(ticketId, (tx) => tx.ticket.update({ where: { id: ticketId }, data: { version: { increment: 1 } } }))
    await lock.acquired

    let finished = false
    const pending = setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 }).then((response) => {
      finished = true
      return response
    })
    await waitUntilBlocked()
    expect(finished).toBe(false)

    lock.release()
    await lock.done
    const response = await pending
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('STALE_VERSION')
    expect(await row(ticketId)).toMatchObject({ status: 'IN_PROGRESS', version: 2 })
  })
})

describe('WF-09 · AC-22 · BR-26 · the history records each material change once, in order', () => {
  it('shows a scripted sequence of status, owner, priority and Action changes as one event each', async () => {
    const ticketId = await makeTicket({ status: 'NEW', ownerEmail: null })

    expect((await setOwner(ticketId, patricia, { ownerId: 'me' })).status).toBe(200)
    expect((await setPriority(ticketId, patricia, { itPriority: 'HIGH' })).status).toBe(200)
    expect((await setStatus(ticketId, patricia, { status: 'IN_PROGRESS', expectedVersion: await version(ticketId) })).status).toBe(200)
    const created = (await createAction(ticketId, patricia, id.olivia)).body.data as { id: string }
    expect((await editAction(ticketId, created.id, patricia, { expectedVersion: 1, description: 'Collect the gateway log', assigneeId: id.daniel })).status).toBe(200)
    expect((await moveAction(ticketId, created.id, daniel, { expectedVersion: 2, status: 'IN_PROGRESS' })).status).toBe(200)
    expect((await moveAction(ticketId, created.id, daniel, { expectedVersion: 3, status: 'COMPLETED', result: 'Log collected' })).status).toBe(200)
    expect((await setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: await version(ticketId) })).status).toBe(200)

    const events = (await dataOf(history(ticketId, patricia))) as { type: string; actor: { displayName: string }; details: Record<string, unknown>; createdAt: string }[]
    expect(events.map((e) => e.type)).toEqual([
      'OWNER_CHANGED',
      'STATUS_CHANGED',
      'IT_PRIORITY_CHANGED',
      'STATUS_CHANGED',
      'ACTION_CREATED',
      'ACTION_UPDATED',
      'ACTION_ASSIGNED',
      'ACTION_STARTED',
      'ACTION_COMPLETED',
      'STATUS_CHANGED',
    ])
    expect(events.map((e) => e.actor.displayName)).toEqual([
      'Patricia Evans', 'Patricia Evans', 'Patricia Evans', 'Patricia Evans', 'Patricia Evans',
      'Patricia Evans', 'Patricia Evans', 'Daniel Carter', 'Daniel Carter', 'Patricia Evans',
    ])
    expect(events[0].details).toEqual({ fromOwner: null, toOwner: 'Patricia Evans' })
    expect(events[1].details).toEqual({ from: 'NEW', to: 'OPEN' })
    expect(events[2].details).toEqual({ from: 'MEDIUM', to: 'HIGH' })
    expect(events[3].details).toEqual({ from: 'OPEN', to: 'IN_PROGRESS' })
    expect(events[4].details).toEqual({ actionId: created.id, assignee: 'Olivia Reed' })
    expect(events[5].details).toEqual({ actionId: created.id, changedFields: ['description'] })
    expect(events[6].details).toEqual({ actionId: created.id, fromAssignee: 'Olivia Reed', toAssignee: 'Daniel Carter' })
    expect(events[7].details).toEqual({ actionId: created.id })
    expect(events[9].details).toEqual({ from: 'IN_PROGRESS', to: 'RESOLVED' })
    const times = events.map((e) => Date.parse(e.createdAt))
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(Object.keys(events[0]).sort()).toEqual(['actor', 'createdAt', 'details', 'id', 'type'])
  })

  it('writes nothing for a refused change', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    await insertAction(ticketId)
    expect((await setStatus(ticketId, patricia, { status: 'RESOLVED', expectedVersion: 1 })).status).toBe(409)
    expect((await setStatus(ticketId, patricia, { status: 'CLOSED', expectedVersion: 1 })).status).toBe(400)
    expect((await setStatus(ticketId, patricia, { status: 'OPEN', expectedVersion: 9 })).status).toBe(409)
    expect(await prisma.ticketEvent.count({ where: { ticketId } })).toBe(0)
  })
})

describe('WF-10 · AC-23 · BR-28 · who sees which events', () => {
  it('gives the Requester status changes only and IT Staff every event', async () => {
    const ticketId = await makeTicket({ status: 'NEW', ownerEmail: null })
    await setOwner(ticketId, patricia, { ownerId: 'me' })
    await setPriority(ticketId, patricia, { itPriority: 'URGENT' })
    await createAction(ticketId, patricia, id.olivia)
    await setStatus(ticketId, patricia, { status: 'WAITING_FOR_REQUESTER', expectedVersion: await version(ticketId) })

    const staff = (await dataOf(history(ticketId, patricia))) as { type: string }[]
    const owner = (await dataOf(history(ticketId, jennifer))) as { type: string; details: Record<string, unknown> }[]

    expect(new Set(staff.map((e) => e.type))).toEqual(new Set(['OWNER_CHANGED', 'STATUS_CHANGED', 'IT_PRIORITY_CHANGED', 'ACTION_CREATED']))
    expect(staff.length).toBe(5)
    expect(owner.map((e) => e.type)).toEqual(['STATUS_CHANGED', 'STATUS_CHANGED'])
    expect(owner.map((e) => e.details)).toEqual([{ from: 'NEW', to: 'OPEN' }, { from: 'OPEN', to: 'WAITING_FOR_REQUESTER' }])
  })

  it('returns an empty list for a Ticket that has not changed since Lab 4 began', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    const response = await history(ticketId, patricia)
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })
})

describe('WF-11 · AC-24 · BR-29 · records with one timestamp keep one order', () => {
  it('lists Actions, comments, notes and events in the same order across five reads', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const instant = new Date('2026-10-04T02:00:00.000Z')
    // Inserted from the highest identifier down, so the order the rows were written in is the wrong answer.
    const ids = ['f0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001']
    const ascending = [...ids].reverse()
    for (const rowId of ids) {
      await prisma.publicComment.create({ data: { id: rowId, ticketId, authorId: id.jennifer, body: `Comment ${rowId.slice(0, 2)}`, createdAt: instant } })
      await prisma.internalNote.create({ data: { id: rowId, ticketId, authorId: id.patricia, body: `Note ${rowId.slice(0, 2)}`, createdAt: instant } })
      await insertAction(ticketId, { id: rowId, createdAt: instant })
      await prisma.ticketEvent.create({ data: { id: rowId, ticketId, actorId: id.patricia, type: 'STATUS_CHANGED', payload: { from: 'OPEN', to: 'IN_PROGRESS' }, createdAt: instant } })
    }

    const reads = []
    for (let i = 0; i < 5; i += 1) {
      const idsOf = async (call: Promise<request.Response>) => (await dataOf(call)).map((entry: { id: string }) => entry.id)
      reads.push({
        comments: await idsOf(request(app).get(`/api/tickets/${ticketId}/comments`).set('Cookie', patricia)),
        notes: await idsOf(request(app).get(`/api/tickets/${ticketId}/internal-notes`).set('Cookie', patricia)),
        actions: await idsOf(request(app).get(`/api/tickets/${ticketId}/actions`).set('Cookie', patricia)),
        events: await idsOf(history(ticketId, patricia)),
      })
    }
    for (const read of reads) {
      expect(read.comments).toEqual(ascending)
      expect(read.notes).toEqual(ascending)
      expect(read.actions).toEqual(ascending)
      expect(read.events).toEqual(ascending)
    }
  })
})

describe('WF-12 · AC-25 · BR-25 · the Requester indication stays advisory', () => {
  it('records the indication on a Ticket with open Actions, keeps the status, and bumps the version', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    await insertAction(ticketId)

    const response = await request(app).post(`/api/tickets/${ticketId}/requester-resolution`).set('Cookie', jennifer).send({})

    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('IN_PROGRESS')
    const stored = await row(ticketId)
    expect(stored.requesterResolvedAt).not.toBeNull()
    expect(stored.status).toBe('IN_PROGRESS')
    expect(stored.version).toBe(2)
    expect(await prisma.actionTaken.count({ where: { ticketId, status: 'PLANNED' } })).toBe(1)
  })
})

describe('WF-13 · BR-32 · owner and IT Priority keep their Lab 3 shape', () => {
  it('changes the owner without a version, bumps the version once, and writes OWNER_CHANGED', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: null })

    const response = await setOwner(ticketId, patricia, { ownerId: id.olivia })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ version: 2, owner: { displayName: 'Olivia Reed' } })
    expect((await eventsOf(ticketId)).map((e) => [e.type, e.payload])).toEqual([
      ['OWNER_CHANGED', { fromOwnerId: null, toOwnerId: id.olivia }],
    ])
  })

  it('changes the IT Priority without a version, bumps the version once, and writes IT_PRIORITY_CHANGED', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })

    const response = await setPriority(ticketId, patricia, { itPriority: 'URGENT' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ version: 2, itPriority: 'URGENT' })
    expect((await eventsOf(ticketId)).map((e) => [e.type, e.payload])).toEqual([
      ['IT_PRIORITY_CHANGED', { from: 'MEDIUM', to: 'URGENT' }],
    ])
  })

  it('moves a claimed NEW Ticket to OPEN in the same write: one version bump, two events', async () => {
    const ticketId = await makeTicket({ status: 'NEW', ownerEmail: null })

    const response = await setOwner(ticketId, patricia, { ownerId: 'me' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ status: 'OPEN', version: 2 })
    expect((await eventsOf(ticketId)).map((e) => e.type)).toEqual(['OWNER_CHANGED', 'STATUS_CHANGED'])
  })

  it('treats a change to what is already there as no change: no version, no event', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })

    expect((await setOwner(ticketId, patricia, { ownerId: id.daniel })).status).toBe(200)
    expect((await setPriority(ticketId, patricia, { itPriority: 'MEDIUM' })).status).toBe(200)

    expect(await row(ticketId)).toMatchObject({ version: 1 })
    expect(await prisma.ticketEvent.count({ where: { ticketId } })).toBe(0)
  })

  it('leaves the Ticket updatedAt exactly as it was when an owner or IT Priority change changes nothing (BR-31, BR-35)', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    const before = await row(ticketId)
    // A clock a minute ahead, so any write of "now" shows as a different instant.
    const later = new Date(Date.now() + 60_000)
    const atLater = () => request(createApp({ now: () => later }))

    const owner = await atLater().patch(`/api/staff/tickets/${ticketId}/owner`).set('Cookie', patricia).send({ ownerId: id.daniel })
    const priority = await atLater().patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'MEDIUM' })
    expect([owner.status, priority.status]).toEqual([200, 200])

    const after = await row(ticketId)
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime())
    expect(after.version).toBe(before.version)
    expect(await prisma.ticketEvent.count({ where: { ticketId } })).toBe(0)
  })

  it('leaves the Ticket updatedAt exactly as it was when an Action edit changes nothing (BR-31, BR-35)', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const created = await createAction(ticketId, patricia, id.olivia)
    expect(created.status, 'fixture Action').toBe(201)
    const before = await row(ticketId)
    const later = new Date(Date.now() + 60_000)

    const response = await request(createApp({ now: () => later }))
      .patch(`/api/tickets/${ticketId}/actions/${created.body.data.id}`)
      .set('Cookie', patricia)
      .send({ expectedVersion: 1, assigneeId: id.olivia, description: created.body.data.description })

    expect(response.status).toBe(200)
    expect(response.body.data.version).toBe(1)
    expect((await row(ticketId)).updatedAt.getTime()).toBe(before.updatedAt.getTime())
    expect((await eventsOf(ticketId)).map((e) => e.type)).toEqual(['ACTION_CREATED'])
  })

  it('answers a status change to the status it already has with 400, and moves nothing (BR-19, BR-31)', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    const before = await row(ticketId)
    const later = new Date(Date.now() + 60_000)

    const response = await request(createApp({ now: () => later }))
      .patch(`/api/staff/tickets/${ticketId}/status`)
      .set('Cookie', patricia)
      .send({ status: 'OPEN', expectedVersion: 1 })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION')
    const after = await row(ticketId)
    expect([after.version, after.updatedAt.getTime()]).toEqual([before.version, before.updatedAt.getTime()])
    expect(await prisma.ticketEvent.count({ where: { ticketId } })).toBe(0)
  })

  it('still refuses what Lab 3 refused', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    expect((await setOwner(ticketId, jennifer, { ownerId: id.olivia })).status).toBe(403)
    expect((await setPriority(ticketId, patricia, { itPriority: 'URGENT', requestedPriority: 'LOW' })).status).toBe(400)
    expect(await row(ticketId)).toMatchObject({ version: 1, ownerId: id.daniel })
  })
})

describe('WF-15 · AC-22 · BR-29 · one Ticket\'s events keep the order the changes were committed in', () => {
  const instant = new Date('2026-10-05T03:00:00.000Z')
  const at = (when: Date) => request(createApp({ now: () => when }))
  const strictlyAscending = (events: { createdAt: Date }[]) => events.every((e, i) => i === 0 || e.createdAt > events[i - 1].createdAt)

  it('puts a change made in the same millisecond after the two events of the claim before it', async () => {
    const ticketId = await makeTicket({ status: 'NEW', ownerEmail: null })

    expect((await at(instant).patch(`/api/staff/tickets/${ticketId}/owner`).set('Cookie', patricia).send({ ownerId: 'me' })).status).toBe(200)
    expect((await at(instant).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'URGENT' })).status).toBe(200)

    const events = await eventsOf(ticketId)
    expect(events.map((e) => e.type)).toEqual(['OWNER_CHANGED', 'STATUS_CHANGED', 'IT_PRIORITY_CHANGED'])
    expect(strictlyAscending(events)).toBe(true)
    expect((await dataOf(history(ticketId, patricia))).map((e) => e.type)).toEqual(['OWNER_CHANGED', 'STATUS_CHANGED', 'IT_PRIORITY_CHANGED'])
  })

  it('puts a change that starts inside a cancellation burst after every event of the burst', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    for (let n = 0; n < 40; n += 1) await insertAction(ticketId, { status: n % 2 === 0 ? 'PLANNED' : 'IN_PROGRESS' })

    const cancelled = await at(instant).patch(`/api/staff/tickets/${ticketId}/status`).set('Cookie', patricia).send({ status: 'CANCELLED', expectedVersion: 1 })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.data.cancelledActionCount).toBe(40)
    // 5 ms later: well inside the 40 ms the burst's events are spread over.
    const later = new Date(instant.getTime() + 5)
    expect((await at(later).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'LOW' })).status).toBe(200)

    const events = await eventsOf(ticketId)
    expect(events).toHaveLength(42)
    expect(events[0].type).toBe('STATUS_CHANGED')
    expect(events.slice(1, 41).every((e) => e.type === 'ACTION_CANCELLED')).toBe(true)
    expect(events[41].type).toBe('IT_PRIORITY_CHANGED')
    expect(strictlyAscending(events)).toBe(true)
  })

  it('keeps a change after the one before it even when the server clock has gone backwards', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })

    expect((await at(instant).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'URGENT' })).status).toBe(200)
    expect((await at(new Date(instant.getTime() - 10_000)).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'LOW' })).status).toBe(200)

    const events = await eventsOf(ticketId)
    expect(events.map((e) => e.payload)).toEqual([
      { from: 'MEDIUM', to: 'URGENT' },
      { from: 'URGENT', to: 'LOW' },
    ])
    expect(strictlyAscending(events)).toBe(true)
  })
})

describe('WF-16 · BR-35 · BR-38 · the Ticket updatedAt only moves forward, whatever the clock of a request says', () => {
  const at = (when: Date) => request(createApp({ now: () => when }))
  const base = Date.now() + 120_000

  it('keeps the latest instant when a request that waited for the lock carries an earlier one, for every kind of change', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const updatedAt = async () => (await row(ticketId)).updatedAt.getTime()

    expect((await at(new Date(base)).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'URGENT' })).status).toBe(200)
    expect(await updatedAt()).toBe(base)

    expect((await at(new Date(base - 30_000)).patch(`/api/staff/tickets/${ticketId}/owner`).set('Cookie', patricia).send({ ownerId: id.olivia })).status).toBe(200)
    expect(await updatedAt(), 'owner change').toBe(base)
    expect((await at(new Date(base - 40_000)).patch(`/api/staff/tickets/${ticketId}/status`).set('Cookie', patricia).send({ status: 'WAITING_FOR_REQUESTER', expectedVersion: 3 })).status).toBe(200)
    expect(await updatedAt(), 'status change').toBe(base)

    const created = await at(new Date(base - 50_000)).post(`/api/tickets/${ticketId}/actions`).set('Cookie', patricia)
      .send({ requestId: randomUUID(), description: 'Collect the relay error.', assigneeId: id.olivia })
    expect(created.status).toBe(201)
    expect(await updatedAt(), 'Action create').toBe(base)
    const edited = await at(new Date(base - 60_000)).patch(`/api/tickets/${ticketId}/actions/${created.body.data.id}`).set('Cookie', patricia)
      .send({ expectedVersion: 1, description: 'Collect the relay error and the gateway log.' })
    expect(edited.status).toBe(200)
    expect(await updatedAt(), 'Action edit').toBe(base)
    const started = await at(new Date(base - 70_000)).patch(`/api/tickets/${ticketId}/actions/${created.body.data.id}/status`).set('Cookie', patricia)
      .send({ expectedVersion: 2, status: 'IN_PROGRESS' })
    expect(started.status).toBe(200)
    expect(await updatedAt(), 'Action move').toBe(base)
    expect((await at(new Date(base - 80_000)).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'LOW' })).status).toBe(200)
    expect(await updatedAt(), 'IT Priority change').toBe(base)
  })

  it('still moves forward when a request carries a later instant (positive control)', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })

    expect((await at(new Date(base)).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'URGENT' })).status).toBe(200)
    expect((await at(new Date(base + 90_000)).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'LOW' })).status).toBe(200)

    expect((await row(ticketId)).updatedAt.getTime()).toBe(base + 90_000)
  })
})

describe('WF-17 · AC-25 · BR-25 · BR-33 · BR-35 · the Requester indication is written under the Ticket lock, like every other change', () => {
  const indicate = (ticketId: string, now?: Date) =>
    request(now ? createApp({ now: () => now }) : app).post(`/api/tickets/${ticketId}/requester-resolution`).set('Cookie', jennifer).send({})

  /** Starts the request while another transaction holds the Ticket and commits `whileHeld`, then lets it go. */
  async function indicateBehindLock(ticketId: string, whileHeld?: Parameters<typeof holdTicketLock>[1]) {
    const lock = holdTicketLock(ticketId, whileHeld)
    await lock.acquired
    let finished = false
    const pending = indicate(ticketId).then((response) => {
      finished = true
      return response
    })
    await waitUntilBlocked()
    expect(finished, 'the request waits for the lock').toBe(false)
    lock.release()
    await lock.done
    return pending
  }

  it('waits for the lock and then records the indication (positive control)', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })

    const response = await indicateBehindLock(ticketId)

    expect(response.status).toBe(200)
    expect(await row(ticketId)).toMatchObject({ status: 'IN_PROGRESS', version: 2 })
    expect((await row(ticketId)).requesterResolvedAt).not.toBeNull()
  })

  it.each(['CANCELLED', 'CLOSED'] as const)('refuses it, and stores nothing, when the Ticket became %s while the request waited', async (terminal) => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })

    const response = await indicateBehindLock(ticketId, (tx) => tx.ticket.update({ where: { id: ticketId }, data: { status: terminal, version: { increment: 1 } } }))

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('TICKET_CLOSED')
    const stored = await row(ticketId)
    expect(stored).toMatchObject({ status: terminal, version: 2, requesterResolvedAt: null })
  })

  it('keeps the later instant when the request carries an earlier one, as every other change does (BR-35)', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const base = Date.now() + 120_000
    const first = await request(createApp({ now: () => new Date(base) })).patch(`/api/staff/tickets/${ticketId}/it-priority`).set('Cookie', patricia).send({ itPriority: 'URGENT' })
    expect(first.status).toBe(200)

    expect((await indicate(ticketId, new Date(base - 30_000))).status).toBe(200)

    expect((await row(ticketId)).updatedAt.getTime()).toBe(base)
  })

  it('stamps the Ticket with the same instant as the indication, so one clock explains both (BR-35)', async () => {
    const ticketId = await makeTicket({ status: 'IN_PROGRESS', ownerEmail: DANIEL_EMAIL })
    const later = new Date(Date.now() + 90_000)

    expect((await indicate(ticketId, later)).status).toBe(200)

    const stored = await row(ticketId)
    expect(stored.requesterResolvedAt!.getTime()).toBe(later.getTime())
    expect(stored.updatedAt.getTime()).toBe(later.getTime())
  })
})

describe('WF-14 · AC-19 · BR-31 · expectedVersion is required on a status change', () => {
  it('answers 400 VALIDATION_FAILED without it, and for anything that is not a version', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    const bodies: unknown[] = [
      { status: 'IN_PROGRESS' },
      { status: 'IN_PROGRESS', expectedVersion: null },
      { status: 'IN_PROGRESS', expectedVersion: '1' },
      { status: 'IN_PROGRESS', expectedVersion: 1.5 },
      { status: 'IN_PROGRESS', expectedVersion: 0 },
      { status: 'IN_PROGRESS', expectedVersion: -1 },
      { status: 'IN_PROGRESS', expectedVersion: 1, version: 7 },
    ]
    for (const body of bodies) {
      const response = await setStatus(ticketId, patricia, body)
      expect(response.status, JSON.stringify(body)).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_FAILED')
    }
    const missing = await setStatus(ticketId, patricia, { status: 'IN_PROGRESS' })
    expect(missing.body.error.fieldErrors.map((e: { field: string }) => e.field)).toContain('expectedVersion')
    expect(await row(ticketId)).toMatchObject({ status: 'OPEN', version: 1 })
  })

  it('validates the body before it looks for the Ticket, so a missing version is 400 even for an unknown Ticket', async () => {
    const response = await setStatus(randomUUID(), patricia, { status: 'IN_PROGRESS' })
    expect(response.status).toBe(400)
    const unknown = await setStatus(randomUUID(), patricia, { status: 'IN_PROGRESS', expectedVersion: 1 })
    expect(unknown.status).toBe(404)
  })
})

describe('SEC-02 · AC-12 · AC-23 · history belongs to the Ticket and its Requester', () => {
  it('answers 404 to another Requester, identical to a Ticket that does not exist', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    await setPriority(ticketId, patricia, { itPriority: 'HIGH' })
    expect((await history(ticketId, jennifer)).status, 'positive control: the owner may read').toBe(200)

    const foreign = await history(ticketId, michael)
    const missing = await history(randomUUID(), michael)

    expect(foreign.status).toBe(404)
    expect(missing.status).toBe(404)
    const strip = (body: { error: Record<string, unknown> }) => ({ ...body.error, correlationId: undefined })
    expect(strip(foreign.body)).toEqual(strip(missing.body))
  })

  it('does not let a Requester change or cancel another Requester\'s Ticket through the status endpoint', async () => {
    const ticketId = await makeTicket({ status: 'NEW', ownerEmail: null })
    const response = await setStatus(ticketId, michael, { status: 'CANCELLED', expectedVersion: 1 })
    expect(response.status).toBe(404)
    expect(await row(ticketId)).toMatchObject({ status: 'NEW', version: 1 })
  })
})

describe('SEC-03 · lab-03 BR-12 · the new and changed endpoints refuse a caller with no session', () => {
  it('answers 401 for the history and the status change', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    expect((await history(ticketId)).status).toBe(401)
    expect((await request(app).patch(`/api/staff/tickets/${ticketId}/status`).send({ status: 'IN_PROGRESS', expectedVersion: 1 })).status).toBe(401)
    expect(await row(ticketId)).toMatchObject({ status: 'OPEN', version: 1 })
  })
})

describe('SEC-06 · AC-22 · BR-27 · the database refuses to change or delete history', () => {
  it('rejects a direct UPDATE and DELETE of an event written through the API, and leaves the row alone', async () => {
    const ticketId = await makeTicket({ status: 'OPEN', ownerEmail: DANIEL_EMAIL })
    await setPriority(ticketId, patricia, { itPriority: 'HIGH' })
    const [event] = await eventsOf(ticketId)
    expect(event, 'an event exists to attack').toBeDefined()

    await expect(prisma.$executeRaw`UPDATE "TicketEvent" SET "type" = 'OWNER_CHANGED' WHERE "id" = ${event.id}::uuid`).rejects.toThrow(/append-only/i)
    await expect(prisma.$executeRaw`DELETE FROM "TicketEvent" WHERE "id" = ${event.id}::uuid`).rejects.toThrow(/append-only/i)
    expect(await prisma.ticketEvent.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({ type: 'IT_PRIORITY_CHANGED', payload: event.payload })
  })
})

describe('SEC-07 · BR-30 · history and detail responses carry no secrets or foreign addresses', () => {
  it('contains no hash, session id or email address in what either role reads', async () => {
    const ticketId = await makeTicket({ status: 'NEW', ownerEmail: null })
    await setOwner(ticketId, patricia, { ownerId: id.olivia })
    await createAction(ticketId, patricia, id.daniel, { description: 'SECRET-LOOKING DESCRIPTION' })
    await setStatus(ticketId, patricia, { status: 'WAITING_FOR_REQUESTER', expectedVersion: await version(ticketId) })

    const emails = (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email)
    const sessionValues = [patricia, jennifer].map((cookie) => cookie.split('=')[1]?.split(';')[0] ?? '')
    const responses = [
      await history(ticketId, patricia),
      await history(ticketId, jennifer),
      await requesterDetail(ticketId, jennifer),
      await staffDetail(ticketId, patricia),
    ]
    expect(responses.map((response) => response.status), 'each read succeeded').toEqual([200, 200, 200, 200])
    const reads = responses.map((response) => response.text)
    for (const text of reads) {
      expect(text.length).toBeGreaterThan(50)
      for (const email of emails) expect(text, email).not.toContain(email)
      for (const value of sessionValues) expect(value.length).toBeGreaterThan(10)
      for (const value of sessionValues) expect(text).not.toContain(value)
      expect(text).not.toMatch(/\$argon2|\$2[aby]\$|passwordHash/)
    }
    const requesterView = (await history(ticketId, jennifer)).text
    expect(requesterView).not.toContain('SECRET-LOOKING')
    expect((await history(ticketId, patricia)).text).not.toContain('SECRET-LOOKING')
  })
})
