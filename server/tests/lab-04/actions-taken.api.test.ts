// API-01 to API-18, SEC-01 to SEC-03, SEC-07 (Actions part) · lab-04 AC-01 to AC-14, AC-19; api-spec.md §3.
// Every call goes over HTTP as a named person. Persistence is read back from the database, not trusted
// from a response (TC-007, TC-009). Authorization is exercised directly, never through a screen.
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import app, { createApp } from '../../src/app.js'
import prisma from '../../src/prisma.js'
import type { TicketStatus } from '../../src/tickets/transitions.js'
import {
  ADMIN_EMAIL,
  DANIEL_EMAIL,
  INACTIVE_STAFF_EMAIL,
  NOT_WORKABLE,
  OLIVIA_EMAIL,
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  WORKABLE,
  clearHistory,
  idFor,
  removeTickets,
  restoreSeededCredentials,
  signIn,
  ticketFactory,
} from './lab4-fixtures.js'

const BAND = 'TKT-2026-98'
const makeTicket = ticketFactory(BAND)

let patricia = ''
let daniel = ''
let olivia = ''
let margaret = ''
let jennifer = ''
let michael = ''
const id: Record<string, string> = {}

const create = (ticketId: string, cookie: string, body: unknown) =>
  request(app).post(`/api/tickets/${ticketId}/actions`).set('Cookie', cookie).send(body as object)
const edit = (ticketId: string, actionId: string, cookie: string, body: unknown) =>
  request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}`).set('Cookie', cookie).send(body as object)
const move = (ticketId: string, actionId: string, cookie: string, body: unknown) =>
  request(app).patch(`/api/tickets/${ticketId}/actions/${actionId}/status`).set('Cookie', cookie).send(body as object)
const list = (ticketId: string, cookie: string) =>
  request(app).get(`/api/tickets/${ticketId}/actions`).set('Cookie', cookie)

const valid = (assigneeId: string, over: Record<string, unknown> = {}) => ({
  requestId: randomUUID(),
  description: 'Collect the relay error from the mail gateway log.',
  assigneeId,
  ...over,
})
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A fresh Ticket (owned by Daniel) with one Action created by Patricia for Olivia. */
async function withAction(ticketStatus: TicketStatus = 'IN_PROGRESS') {
  const ticketId = await makeTicket({ status: ticketStatus, ownerEmail: DANIEL_EMAIL })
  const response = await create(ticketId, patricia, valid(id.olivia))
  expect(response.status, 'fixture Action').toBe(201)
  return { ticketId, action: response.body.data as { id: string; version: number } }
}

const row = (actionId: string) => prisma.actionTaken.findUniqueOrThrow({ where: { id: actionId } })
const eventTypes = async (ticketId: string) =>
  (await prisma.ticketEvent.findMany({ where: { ticketId }, select: { type: true } })).map((e) => e.type).sort()

beforeAll(async () => {
  ;[patricia, daniel, olivia, margaret, jennifer, michael] = await Promise.all([
    signIn(STAFF_EMAIL),
    signIn(DANIEL_EMAIL),
    signIn(OLIVIA_EMAIL),
    signIn(ADMIN_EMAIL),
    signIn(REQUESTER_EMAIL),
    signIn(OTHER_REQUESTER_EMAIL),
  ])
  id.patricia = await idFor(STAFF_EMAIL)
  id.daniel = await idFor(DANIEL_EMAIL)
  id.olivia = await idFor(OLIVIA_EMAIL)
  id.margaret = await idFor(ADMIN_EMAIL)
  id.jennifer = await idFor(REQUESTER_EMAIL)
  id.thomas = await idFor(INACTIVE_STAFF_EMAIL)
}, 60_000)

afterAll(async () => {
  await removeTickets(BAND)
  await prisma.user.update({ where: { email: OLIVIA_EMAIL }, data: { isActive: true } })
  await restoreSeededCredentials()
})

describe('API-01 · AC-01 · BR-05 · creating an Action', () => {
  it('stores it under the Ticket with the caller as performer, the named assignee, PLANNED and a server time', async () => {
    const ticketId = await makeTicket({ ownerEmail: DANIEL_EMAIL })
    const before = Date.now()
    const response = await create(ticketId, patricia, valid(id.olivia, { attachmentNotes: ' See relay-error.png ' }))
    const after = Date.now()

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      status: 'PLANNED',
      version: 1,
      attachmentNotes: 'See relay-error.png',
      followUpRequired: false,
      followUpNote: null,
      result: null,
      performedBy: { id: id.patricia },
      assignee: { id: id.olivia, isActive: true },
      completedBy: null,
      cancelledBy: null,
    })
    const actionAt = Date.parse(response.body.data.actionAt)
    expect(actionAt).toBeGreaterThanOrEqual(before - 2000)
    expect(actionAt).toBeLessThanOrEqual(after + 2000)

    const stored = await row(response.body.data.id)
    expect(stored).toMatchObject({ ticketId, performedById: id.patricia, assigneeId: id.olivia, status: 'PLANNED' })
  })

  it('lets an Administrator do the same (BR-04)', async () => {
    const ticketId = await makeTicket()
    const response = await create(ticketId, margaret, valid(id.margaret))
    expect(response.status).toBe(201)
    expect(response.body.data.performedBy.id).toBe(id.margaret)
  })

  it.each(WORKABLE)('is open in the working status %s (BR-23)', async (status) => {
    const ticketId = await makeTicket({ status })
    expect((await create(ticketId, patricia, valid(id.patricia))).status).toBe(201)
  })

  it('requires an assignee, a description and a request identifier, naming each field (BR-06, BR-13, BR-34)', async () => {
    const ticketId = await makeTicket()
    const response = await create(ticketId, patricia, { followUpRequired: false })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_FAILED')
    expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field).sort()).toEqual(
      ['assigneeId', 'description', 'requestId'],
    )
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0)
  })

  it('refuses a description over 2000 characters and Attachment Notes over 500 (BR-13, BR-15)', async () => {
    const ticketId = await makeTicket()
    const response = await create(
      ticketId,
      patricia,
      valid(id.olivia, { description: 'd'.repeat(2001), attachmentNotes: 'n'.repeat(501) }),
    )
    expect(response.status).toBe(400)
    expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field).sort()).toEqual(
      ['attachmentNotes', 'description'],
    )
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0)
  })

  it('answers 404 for a missing Ticket and for a malformed Ticket identifier', async () => {
    const real = await makeTicket()
    expect((await create(real, patricia, valid(id.olivia))).status, 'positive control: the route exists').toBe(201)

    const missing = await create(randomUUID(), patricia, valid(id.olivia))
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('TICKET_NOT_FOUND')
    expect((await create('not-a-uuid', patricia, valid(id.olivia))).status).toBe(404)
  })
})

describe('API-02 · AC-03 · BR-02 · owner, performer and assignee are three different people', () => {
  it('lists every Action in creation order, whoever created it', async () => {
    const ticketId = await makeTicket({ ownerEmail: DANIEL_EMAIL })
    const first = await create(ticketId, patricia, valid(id.olivia, { description: 'First' }))
    const second = await create(ticketId, olivia, valid(id.daniel, { description: 'Second' }))
    const third = await create(ticketId, margaret, valid(id.patricia, { description: 'Third' }))
    // Creation times reversed against identifiers, so only the time can explain the order.
    const base = Date.parse('2026-10-04T03:00:00.000Z')
    for (const [i, created] of [first, second, third].entries()) {
      await prisma.actionTaken.update({
        where: { id: created.body.data.id },
        data: { createdAt: new Date(base + i * 60_000) },
      })
    }

    const response = await list(ticketId, daniel)
    expect(response.status).toBe(200)
    expect(response.body.data.map((a: { description: string }) => a.description)).toEqual(['First', 'Second', 'Third'])

    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { ownerId: true } })
    const [a, b, c] = response.body.data
    expect(ticket.ownerId).toBe(id.daniel)
    expect([a.performedBy.id, b.performedBy.id, c.performedBy.id]).toEqual([id.patricia, id.olivia, id.margaret])
    expect([a.assignee.id, b.assignee.id, c.assignee.id]).toEqual([id.olivia, id.daniel, id.patricia])
    // The owner is neither the performer nor the assignee of the first Action.
    expect(a.performedBy.id).not.toBe(ticket.ownerId)
    expect(a.assignee.id).not.toBe(ticket.ownerId)
  })
})

describe('API-03 · AC-04 · BR-07 · only an active IT Staff or Administrator may be assigned', () => {
  it.each([
    ['an inactive IT Staff user', () => id.thomas],
    ['a Requester', () => id.jennifer],
    ['an unknown user', () => randomUUID()],
  ])('refuses %s and stores nothing', async (_label, assignee) => {
    const ticketId = await makeTicket()
    expect((await create(ticketId, patricia, valid(id.olivia))).status, 'positive control').toBe(201)

    const response = await create(ticketId, patricia, valid(assignee()))
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('ASSIGNEE_NOT_ELIGIBLE')
    expect(response.body.error.fieldErrors[0].field).toBe('assigneeId')
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1)
  })

  it('refuses a user deactivated after the assignee list was fetched', async () => {
    const ticketId = await makeTicket({ ownerEmail: DANIEL_EMAIL })
    const detail = await request(app).get(`/api/staff/tickets/${ticketId}`).set('Cookie', patricia)
    expect(detail.body.data.assignableOwners.map((u: { id: string }) => u.id)).toContain(id.olivia)

    await prisma.user.update({ where: { email: OLIVIA_EMAIL }, data: { isActive: false } })
    try {
      const response = await create(ticketId, patricia, valid(id.olivia))
      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('ASSIGNEE_NOT_ELIGIBLE')
    } finally {
      await prisma.user.update({ where: { email: OLIVIA_EMAIL }, data: { isActive: true } })
    }
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0)
  })
})

describe('API-04 · AC-05 · BR-08 · reassigning', () => {
  it('changes the assignee, keeps the performer and appends ACTION_ASSIGNED', async () => {
    const { ticketId, action } = await withAction()
    const response = await edit(ticketId, action.id, patricia, { expectedVersion: 1, assigneeId: id.daniel })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ version: 2, assignee: { id: id.daniel }, performedBy: { id: id.patricia } })
    expect(await eventTypes(ticketId)).toEqual(['ACTION_ASSIGNED', 'ACTION_CREATED'])
  })

  it('refuses an ineligible new assignee and leaves the Action unchanged', async () => {
    const { ticketId, action } = await withAction()
    const response = await edit(ticketId, action.id, patricia, { expectedVersion: 1, assigneeId: id.thomas })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('ASSIGNEE_NOT_ELIGIBLE')
    expect(await row(action.id)).toMatchObject({ assigneeId: id.olivia, version: 1 })
  })

  it('keeps showing an assignee who was deactivated later, marked inactive (BR-08)', async () => {
    const { ticketId } = await withAction()
    await prisma.user.update({ where: { email: OLIVIA_EMAIL }, data: { isActive: false } })
    try {
      const response = await list(ticketId, patricia)
      expect(response.status).toBe(200)
      expect(response.body.data[0].assignee).toMatchObject({ id: id.olivia, isActive: false })
      expect(response.body.data[0].assignee.displayName).toBeTruthy()
    } finally {
      await prisma.user.update({ where: { email: OLIVIA_EMAIL }, data: { isActive: true } })
    }
  })

  it('changes nothing, and writes no event, when the request changes nothing', async () => {
    const { ticketId, action } = await withAction()
    const response = await edit(ticketId, action.id, patricia, { expectedVersion: 1, assigneeId: id.olivia })
    expect(response.status).toBe(200)
    expect(response.body.data.version).toBe(1)
    expect(await eventTypes(ticketId)).toEqual(['ACTION_CREATED'])
  })

  it('records edited fields as ACTION_UPDATED naming only the fields', async () => {
    const { ticketId, action } = await withAction()
    const response = await edit(ticketId, action.id, daniel, {
      expectedVersion: 1,
      description: 'A private-looking sentence that must not enter the history.',
      result: 'Partial result',
    })
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ version: 2, result: 'Partial result' })

    const events = await prisma.ticketEvent.findMany({ where: { ticketId, type: 'ACTION_UPDATED' } })
    expect(events).toHaveLength(1)
    expect((events[0].payload as { changedFields: string[] }).changedFields.sort()).toEqual(['description', 'result'])
    expect(JSON.stringify(events[0].payload)).not.toContain('private-looking')
  })
})

describe('API-05 · AC-06 · starting and completing', () => {
  it('moves PLANNED → IN_PROGRESS → COMPLETED and records the completer and time from the server', async () => {
    const { ticketId, action } = await withAction()
    const started = await move(ticketId, action.id, olivia, { expectedVersion: 1, status: 'IN_PROGRESS' })
    expect(started.status).toBe(200)
    expect(started.body.data).toMatchObject({ status: 'IN_PROGRESS', version: 2, completedBy: null })

    const before = Date.now()
    const completed = await move(ticketId, action.id, olivia, {
      expectedVersion: 2,
      status: 'COMPLETED',
      result: 'Allow-list restored; external mail delivered.',
    })
    expect(completed.status).toBe(200)
    expect(completed.body.data).toMatchObject({
      status: 'COMPLETED',
      version: 3,
      result: 'Allow-list restored; external mail delivered.',
      completedBy: { id: id.olivia },
    })
    expect(Math.abs(Date.parse(completed.body.data.completedAt) - before)).toBeLessThan(5000)
    expect(await row(action.id)).toMatchObject({ status: 'COMPLETED', completedById: id.olivia })
    expect(await eventTypes(ticketId)).toEqual(['ACTION_COMPLETED', 'ACTION_CREATED', 'ACTION_STARTED'])
  })
})

describe('API-06 · AC-07 · BR-11 · completing needs a Result', () => {
  it('refuses a blank Result with a field error and keeps the Action IN_PROGRESS', async () => {
    const { ticketId, action } = await withAction()
    await move(ticketId, action.id, olivia, { expectedVersion: 1, status: 'IN_PROGRESS' })

    for (const body of [{}, { result: '' }, { result: '   ' }]) {
      const response = await move(ticketId, action.id, olivia, { expectedVersion: 2, status: 'COMPLETED', ...body })
      expect(response.status, JSON.stringify(body)).toBe(400)
      expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field)).toEqual(['result'])
    }
    expect(await row(action.id)).toMatchObject({ status: 'IN_PROGRESS', version: 2 })
  })

  it('accepts a Result stored earlier, without supplying it again', async () => {
    const { ticketId, action } = await withAction()
    await move(ticketId, action.id, olivia, { expectedVersion: 1, status: 'IN_PROGRESS' })
    await edit(ticketId, action.id, olivia, { expectedVersion: 2, result: 'Found and fixed.' })
    const response = await move(ticketId, action.id, olivia, { expectedVersion: 3, status: 'COMPLETED' })
    expect(response.status).toBe(200)
    expect(response.body.data.result).toBe('Found and fixed.')
  })

  it('refuses COMPLETED straight from PLANNED, naming the current status and the permitted moves (BR-09)', async () => {
    const { ticketId, action } = await withAction()
    const response = await move(ticketId, action.id, olivia, { expectedVersion: 1, status: 'COMPLETED', result: 'x' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_ACTION_TRANSITION')
    expect(response.body.error.details).toEqual({
      currentStatus: 'PLANNED',
      permittedTransitions: ['IN_PROGRESS', 'CANCELLED'],
    })
    expect(await row(action.id)).toMatchObject({ status: 'PLANNED', version: 1 })
  })

  it('does not accept PLANNED as a target', async () => {
    const { ticketId, action } = await withAction()
    await move(ticketId, action.id, olivia, { expectedVersion: 1, status: 'IN_PROGRESS' })
    const response = await move(ticketId, action.id, olivia, { expectedVersion: 2, status: 'PLANNED' })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_ACTION_TRANSITION')
  })
})

describe('API-07 · AC-08 · BR-12 · cancelling needs a reason', () => {
  it('refuses a missing or blank reason, then cancels with one and records who and when', async () => {
    const { ticketId, action } = await withAction()
    for (const body of [{}, { cancellationReason: '  ' }, { cancellationReason: 'r'.repeat(501) }]) {
      const refused = await move(ticketId, action.id, daniel, { expectedVersion: 1, status: 'CANCELLED', ...body })
      expect(refused.status).toBe(400)
      expect(refused.body.error.fieldErrors[0].field).toBe('cancellationReason')
    }
    expect(await row(action.id)).toMatchObject({ status: 'PLANNED', version: 1 })

    const cancelled = await move(ticketId, action.id, daniel, {
      expectedVersion: 1,
      status: 'CANCELLED',
      cancellationReason: ' The vendor already fixed it. ',
    })
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.data).toMatchObject({
      status: 'CANCELLED',
      cancellationReason: 'The vendor already fixed it.',
      cancelledBy: { id: id.daniel },
      version: 2,
    })
    expect(await eventTypes(ticketId)).toEqual(['ACTION_CANCELLED', 'ACTION_CREATED'])
  })

  it('does not accept a Result when cancelling, or a reason when completing', async () => {
    const { ticketId, action } = await withAction()
    const response = await move(ticketId, action.id, daniel, {
      expectedVersion: 1,
      status: 'CANCELLED',
      cancellationReason: 'No longer needed',
      result: 'stray',
    })
    expect(response.status).toBe(400)
    expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field)).toEqual(['result'])
  })
})

describe('API-08 · AC-09 · BR-10 · COMPLETED and CANCELLED are final', () => {
  async function finished(kind: 'COMPLETED' | 'CANCELLED') {
    const { ticketId, action } = await withAction()
    if (kind === 'COMPLETED') {
      await move(ticketId, action.id, olivia, { expectedVersion: 1, status: 'IN_PROGRESS' })
      await move(ticketId, action.id, olivia, { expectedVersion: 2, status: 'COMPLETED', result: 'Done' })
    } else {
      await move(ticketId, action.id, olivia, { expectedVersion: 1, status: 'CANCELLED', cancellationReason: 'Not needed' })
    }
    return { ticketId, actionId: action.id, version: kind === 'COMPLETED' ? 3 : 2 }
  }

  it.each(['COMPLETED', 'CANCELLED'] as const)('refuses every change to a %s Action and leaves the row alone', async (kind) => {
    const { ticketId, actionId, version } = await finished(kind)
    const snapshot = JSON.stringify(await row(actionId))

    const attempts = [
      edit(ticketId, actionId, patricia, { expectedVersion: version, description: 'Changed' }),
      edit(ticketId, actionId, patricia, { expectedVersion: version, assigneeId: id.daniel }),
      move(ticketId, actionId, patricia, { expectedVersion: version, status: 'IN_PROGRESS' }),
      move(ticketId, actionId, patricia, { expectedVersion: version, status: 'CANCELLED', cancellationReason: 'again' }),
    ]
    for (const attempt of attempts) {
      const response = await attempt
      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('ACTION_TERMINAL')
    }
    expect(JSON.stringify(await row(actionId))).toBe(snapshot)
  })
})

describe('API-09 · AC-10 · BR-14 · the follow-up note', () => {
  it('requires a note when follow-up is needed, and refuses one when it is not', async () => {
    const ticketId = await makeTicket()
    const noNote = await create(ticketId, patricia, valid(id.olivia, { followUpRequired: true }))
    expect(noNote.status).toBe(400)
    expect(noNote.body.error.fieldErrors.map((e: { field: string }) => e.field)).toEqual(['followUpNote'])

    const orphan = await create(ticketId, patricia, valid(id.olivia, { followUpRequired: false, followUpNote: 'orphan' }))
    expect(orphan.status).toBe(400)
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0)

    const ok = await create(ticketId, patricia, valid(id.olivia, { followUpRequired: true, followUpNote: ' Call the vendor ' }))
    expect(ok.status).toBe(201)
    expect(ok.body.data).toMatchObject({ followUpRequired: true, followUpNote: 'Call the vendor' })
  })

  it('clears the stored note when follow-up is switched off', async () => {
    const ticketId = await makeTicket()
    const created = await create(ticketId, patricia, valid(id.olivia, { followUpRequired: true, followUpNote: 'Call the vendor' }))
    const response = await edit(ticketId, created.body.data.id, patricia, { expectedVersion: 1, followUpRequired: false })
    expect(response.status).toBe(200)
    expect(await row(created.body.data.id)).toMatchObject({ followUpRequired: false, followUpNote: null })
  })
})

describe('API-10 · AC-11 · BR-05 · server-owned fields are refused, never ignored', () => {
  const serverOwned = [
    'id', 'ticketId', 'status', 'version', 'performedById', 'performedBy', 'actionAt', 'createdAt', 'updatedAt',
    'completedBy', 'completedById', 'completedAt', 'cancelledBy', 'cancelledById', 'cancelledAt',
  ]

  it.each(serverOwned)('refuses %s on create and stores nothing', async (field) => {
    const ticketId = await makeTicket()
    const response = await create(ticketId, patricia, valid(id.olivia, { [field]: field === 'version' ? 5 : 'forged' }))
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_FAILED')
    expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field)).toContain(field)
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0)
  })

  it('refuses status, performer and version in an edit, and a performer in a status change', async () => {
    const { ticketId, action } = await withAction()
    for (const extra of [{ status: 'COMPLETED' }, { performedById: id.daniel }, { version: 9 }]) {
      const response = await edit(ticketId, action.id, patricia, { expectedVersion: 1, description: 'x', ...extra })
      expect(response.status, JSON.stringify(extra)).toBe(400)
    }
    const response = await move(ticketId, action.id, patricia, { expectedVersion: 1, status: 'IN_PROGRESS', performedById: id.daniel })
    expect(response.status).toBe(400)
    expect(await row(action.id)).toMatchObject({ status: 'PLANNED', performedById: id.patricia, version: 1 })
  })

  it('refuses an edit that changes nothing it is allowed to change', async () => {
    const { ticketId, action } = await withAction()
    const response = await edit(ticketId, action.id, patricia, { expectedVersion: 1 })
    expect(response.status).toBe(400)
  })
})

describe('API-11 · AC-13 · BR-23 · Actions are read-only once the Ticket is not in a working status', () => {
  it.each(NOT_WORKABLE)('refuses create, edit and status change while the Ticket is %s', async (status) => {
    const ticketId = await makeTicket({ status })
    const planned = await prisma.actionTaken.create({
      data: { ticketId, description: 'Left open out of band', assigneeId: id.olivia, performedById: id.patricia, requestId: randomUUID() },
    })

    const created = await create(ticketId, patricia, valid(id.olivia))
    const edited = await edit(ticketId, planned.id, patricia, { expectedVersion: 1, description: 'Changed' })
    const moved = await move(ticketId, planned.id, patricia, { expectedVersion: 1, status: 'IN_PROGRESS' })

    for (const response of [created, edited, moved]) {
      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('TICKET_NOT_WORKABLE')
      expect(response.body.error.details).toEqual({ ticketStatus: status })
    }
    expect(await row(planned.id)).toMatchObject({ status: 'PLANNED', description: 'Left open out of band', version: 1 })
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1)
  })
})

describe('API-12 · AC-14 · BR-34 · a retried create returns the Action it already made', () => {
  it('creates one Action for a repeated request identifier, answering 201 and then 200', async () => {
    const ticketId = await makeTicket()
    const body = valid(id.olivia)
    const first = await create(ticketId, patricia, body)
    const second = await create(ticketId, patricia, body)

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(second.body.data.id).toBe(first.body.data.id)
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1)
    expect(await eventTypes(ticketId)).toEqual(['ACTION_CREATED'])
  })

  it('creates one Action when the same request arrives five times at once', async () => {
    const ticketId = await makeTicket()
    const body = valid(id.olivia)
    const responses = await Promise.all(Array.from({ length: 5 }, () => create(ticketId, patricia, body)))

    expect(responses.map((r) => r.status).sort()).toEqual([200, 200, 200, 200, 201])
    expect(new Set(responses.map((r) => r.body.data.id)).size).toBe(1)
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1)
  })

  it('treats a different request identifier as a different Action', async () => {
    const ticketId = await makeTicket()
    await create(ticketId, patricia, valid(id.olivia))
    await create(ticketId, patricia, valid(id.olivia))
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(2)
  })
})

describe('API-13 · AC-19 · BR-31 · stale versions', () => {
  it('refuses an edit and a status change that carry an outdated version, reporting the current one', async () => {
    const { ticketId, action } = await withAction()
    await edit(ticketId, action.id, patricia, { expectedVersion: 1, result: 'Newer' })

    const staleEdit = await edit(ticketId, action.id, daniel, { expectedVersion: 1, description: 'Overwrites?' })
    expect(staleEdit.status).toBe(409)
    expect(staleEdit.body.error.code).toBe('STALE_VERSION')
    expect(staleEdit.body.error.details.currentVersion).toBe(2)

    const staleMove = await move(ticketId, action.id, daniel, { expectedVersion: 1, status: 'IN_PROGRESS' })
    expect(staleMove.status).toBe(409)
    expect(staleMove.body.error.code).toBe('STALE_VERSION')
    expect(await row(action.id)).toMatchObject({ result: 'Newer', status: 'PLANNED', version: 2 })
  })

  it('requires expectedVersion to be a positive integer', async () => {
    const { ticketId, action } = await withAction()
    for (const expectedVersion of [undefined, 0, -1, 1.5, '1']) {
      const response = await edit(ticketId, action.id, patricia, { expectedVersion, description: 'x' })
      expect(response.status, String(expectedVersion)).toBe(400)
      expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field)).toContain('expectedVersion')
    }
  })

  it('lets only one of two simultaneous edits at the same version succeed', async () => {
    const { ticketId, action } = await withAction()
    const [a, b] = await Promise.all([
      edit(ticketId, action.id, patricia, { expectedVersion: 1, description: 'From Patricia' }),
      edit(ticketId, action.id, daniel, { expectedVersion: 1, description: 'From Daniel' }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect((await row(action.id)).version).toBe(2)
  })
})

describe('API-14 · BR-01 · an Action belongs to exactly one Ticket', () => {
  it('answers 404 when the Action is addressed under another Ticket, and changes nothing', async () => {
    const one = await withAction()
    const otherTicket = await makeTicket({ ownerEmail: DANIEL_EMAIL })
    const snapshot = JSON.stringify(await row(one.action.id))

    const edited = await edit(otherTicket, one.action.id, patricia, { expectedVersion: 1, description: 'Moved?' })
    const moved = await move(otherTicket, one.action.id, patricia, { expectedVersion: 1, status: 'IN_PROGRESS' })
    for (const response of [edited, moved]) {
      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('ACTION_NOT_FOUND')
    }
    expect(JSON.stringify(await row(one.action.id))).toBe(snapshot)
    expect((await edit(one.ticketId, one.action.id, patricia, { expectedVersion: 1, description: 'Own Ticket' })).status).toBe(200)
  })

  it('answers 404 for an unknown or malformed Action identifier', async () => {
    const { ticketId, action } = await withAction()
    expect(
      (await edit(ticketId, action.id, patricia, { expectedVersion: 1, description: 'Real' })).status,
      'positive control: the route exists',
    ).toBe(200)

    const unknown = await edit(ticketId, randomUUID(), patricia, { expectedVersion: 1, description: 'x' })
    expect(unknown.status).toBe(404)
    expect(unknown.body.error.code).toBe('ACTION_NOT_FOUND')
    expect((await move(ticketId, 'not-a-uuid', patricia, { expectedVersion: 1, status: 'IN_PROGRESS' })).status).toBe(404)
  })
})

describe('API-15 · BR-35 · the Ticket changes when its Actions do, but not when a comment is posted', () => {
  it('moves the Ticket updatedAt on an Action write and leaves it alone on a Public Comment', async () => {
    const ticketId = await makeTicket()
    const old = new Date('2026-09-01T00:00:00.000Z')
    await prisma.$executeRaw`UPDATE "Ticket" SET "updatedAt" = ${old} WHERE "id" = ${ticketId}::uuid`

    await create(ticketId, patricia, valid(id.olivia))
    const afterAction = (await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).updatedAt
    expect(afterAction.getTime()).toBeGreaterThan(old.getTime())

    await prisma.$executeRaw`UPDATE "Ticket" SET "updatedAt" = ${old} WHERE "id" = ${ticketId}::uuid`
    const comment = await request(app).post(`/api/tickets/${ticketId}/comments`).set('Cookie', patricia).send({ body: 'Hello' })
    expect(comment.status).toBe(201)
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).updatedAt.getTime()).toBe(old.getTime())
  })
})

describe('API-16 · AC-03 · BR-17 · what the Requester sees', () => {
  it('shows every Action with names only, and shows staff the identifiers behind them', async () => {
    const { ticketId } = await withAction()
    const asRequester = await list(ticketId, jennifer)

    expect(asRequester.status).toBe(200)
    expect(asRequester.body.data).toHaveLength(1)
    const action = asRequester.body.data[0]
    expect(Object.keys(action.assignee)).toEqual(['displayName'])
    expect(Object.keys(action.performedBy)).toEqual(['displayName'])
    expect(action).toMatchObject({ status: 'PLANNED', description: expect.any(String) })
    const text = JSON.stringify(asRequester.body)
    expect(text).not.toContain('@example.ac.th')
    expect(text).not.toContain(id.olivia)
    expect(text).not.toContain(id.patricia)

    const asStaff = await list(ticketId, patricia)
    expect(asStaff.body.data[0].assignee).toMatchObject({ id: id.olivia, isActive: true })
  })
})

describe('API-17 · BR-33 · creating an Action waits for the Ticket row lock', () => {
  it('does not finish while another transaction holds the Ticket, and finishes once it lets go', async () => {
    const ticketId = await makeTicket()
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => { release = resolve })
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticketId}::uuid FOR UPDATE`
        await held
      },
      { timeout: 20_000 },
    )
    await sleep(150)

    const pending = create(ticketId, patricia, valid(id.olivia)).then((response) => response)
    const outcome = await Promise.race([pending.then(() => 'finished'), sleep(600).then(() => 'waiting')])
    expect(outcome).toBe('waiting')
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0)

    release()
    await holder
    expect((await pending).status).toBe(201)
  })
})

describe('API-18 · BR-26 · BR-30 · the history', () => {
  it('writes one event per Action write, with identifiers and field names but no free text', async () => {
    const ticketId = await makeTicket()
    const created = await create(ticketId, patricia, valid(id.olivia, { description: 'SECRET-LOOKING DESCRIPTION' }))
    const actionId = created.body.data.id
    await edit(ticketId, actionId, patricia, { expectedVersion: 1, attachmentNotes: 'SECRET-LOOKING NOTES' })
    await move(ticketId, actionId, olivia, { expectedVersion: 2, status: 'IN_PROGRESS' })
    await move(ticketId, actionId, olivia, { expectedVersion: 3, status: 'COMPLETED', result: 'SECRET-LOOKING RESULT' })

    const events = await prisma.ticketEvent.findMany({ where: { ticketId } })
    expect(events.map((e) => e.type).sort()).toEqual(
      ['ACTION_COMPLETED', 'ACTION_CREATED', 'ACTION_STARTED', 'ACTION_UPDATED'],
    )
    expect(events.every((e) => e.actionId === actionId)).toBe(true)
    const actors = new Map(events.map((e) => [e.type, e.actorId]))
    expect(actors.get('ACTION_CREATED')).toBe(id.patricia)
    expect(actors.get('ACTION_COMPLETED')).toBe(id.olivia)
    expect(JSON.stringify(events.map((e) => e.payload))).not.toContain('SECRET-LOOKING')
  })

  it('rolls the Action back when its event cannot be written', async () => {
    const ticketId = await makeTicket()
    const broken = new Proxy(prisma, {
      get(target, property, receiver) {
        if (property !== '$transaction') return Reflect.get(target, property, receiver)
        return (run: (tx: unknown) => unknown, options?: unknown) =>
          target.$transaction(
            (tx) =>
              run(
                new Proxy(tx, {
                  get(inner, key, r) {
                    if (key === 'ticketEvent') return { create: async () => { throw new Error('history store unavailable') } }
                    return Reflect.get(inner, key, r)
                  },
                }),
              ) as Promise<unknown>,
            options as never,
          )
      },
    })
    const failing = createApp({ db: broken })

    const response = await request(failing)
      .post(`/api/tickets/${ticketId}/actions`)
      .set('Cookie', patricia)
      .send(valid(id.olivia))

    expect(response.status).toBe(500)
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(0)
    expect(await prisma.ticketEvent.count({ where: { ticketId } })).toBe(0)
  })
})

describe('SEC-01 · AC-12 · BR-18 · a Requester can read Actions but never write them', () => {
  it('answers 403 to create, edit and status change on their own Ticket, and changes nothing', async () => {
    const { ticketId, action } = await withAction()
    const snapshot = JSON.stringify(await row(action.id))
    expect((await list(ticketId, jennifer)).status, 'positive control: the owner may read').toBe(200)

    const responses = [
      await create(ticketId, jennifer, valid(id.jennifer)),
      await edit(ticketId, action.id, jennifer, { expectedVersion: 1, description: 'Mine now' }),
      await move(ticketId, action.id, jennifer, { expectedVersion: 1, status: 'CANCELLED', cancellationReason: 'No' }),
    ]
    for (const response of responses) {
      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('FORBIDDEN')
      expect(response.body).not.toHaveProperty('data')
    }
    expect(JSON.stringify(await row(action.id))).toBe(snapshot)
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(1)
  })
})

describe('SEC-02 · AC-12 · BR-14 · another Requester reaches nothing', () => {
  it('answers 404, identical to a missing Ticket, and the owner still gets 200', async () => {
    const { ticketId } = await withAction()
    expect((await list(ticketId, jennifer)).status).toBe(200)

    const foreign = await list(ticketId, michael)
    const missing = await list(randomUUID(), michael)
    expect(foreign.status).toBe(404)
    expect(missing.status).toBe(404)
    expect(foreign.body.error.code).toBe(missing.body.error.code)
    expect(foreign.body.error.message).toBe(missing.body.error.message)
    expect(foreign.body).not.toHaveProperty('data')
  })
})

describe('SEC-03 · AC-12 · every Action endpoint refuses a caller with no session', () => {
  it('answers 401 AUTHENTICATION_REQUIRED', async () => {
    const { ticketId, action } = await withAction()
    const calls = [
      request(app).get(`/api/tickets/${ticketId}/actions`),
      request(app).post(`/api/tickets/${ticketId}/actions`).send(valid(id.olivia)),
      request(app).patch(`/api/tickets/${ticketId}/actions/${action.id}`).send({ expectedVersion: 1, description: 'x' }),
      request(app).patch(`/api/tickets/${ticketId}/actions/${action.id}/status`).send({ expectedVersion: 1, status: 'IN_PROGRESS' }),
    ]
    for (const call of calls) {
      const response = await call
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    }
  })
})

describe('SEC-07 · testing-contract §7 · no secret leaves through an Action response', () => {
  it('carries no hash, session, password or e-mail address', async () => {
    const { ticketId, action } = await withAction()
    const responses = [
      await list(ticketId, patricia),
      await list(ticketId, jennifer),
      await edit(ticketId, action.id, patricia, { expectedVersion: 1, description: 'Edited' }),
      await move(ticketId, action.id, olivia, { expectedVersion: 2, status: 'IN_PROGRESS' }),
    ]
    for (const response of responses) {
      const text = JSON.stringify(response.body)
      expect(text).not.toMatch(/passwordHash|mustChangePassword|session|toktickit_session|\$2[aby]\$/i)
      expect(text).not.toContain('@example.ac.th')
    }
  })
})
