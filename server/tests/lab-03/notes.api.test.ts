// API-18…API-21, SEC-T05, SEC-T06, UNIT-05. AC-04, AC-09, AC-17; api-spec §6, §7.
//
// The refusal that matters: returning an empty array to a Requester would
// distinguish "you may not see these" from "there are none", and across several
// Tickets that difference maps out where the notes are.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { MAX_BODY_LENGTH } from '../../src/tickets/threads.js'
import type { Role } from '../../src/auth/types.js'
import {
  ADMIN_EMAIL,
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  restoreSeededCredentials,
  signIn,
} from './auth-fixtures.js'

const TICKET_NO = 'TKT-2026-960001'
const SECRET_NOTE = 'Vendor escalation reference ZX-4471, not for the requester.'

const cookies: Record<Role, string> = {
  REQUESTER: '',
  IT_STAFF: '',
  ADMINISTRATOR: '',
}

let ticketId = ''
let requesterId = ''
let otherRequesterCookie = ''

async function idFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  })
  return user.id
}

async function makeTicket(): Promise<void> {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirstOrThrow({ select: { id: true } }),
    prisma.relatedSystem.findFirstOrThrow({ select: { id: true } }),
  ])
  const ticket = await prisma.ticket.upsert({
    where: { ticketNo: TICKET_NO },
    update: {},
    create: {
      ticketNo: TICKET_NO,
      requesterId,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: 'Threads fixture',
      description: 'Created by notes.api.test.ts.',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
    select: { id: true },
  })
  ticketId = ticket.id
  await prisma.publicComment.deleteMany({ where: { ticketId } })
  await prisma.internalNote.deleteMany({ where: { ticketId } })
}

const comments = (cookie: string) =>
  request(app).get(`/api/tickets/${ticketId}/comments`).set('Cookie', cookie)

const notes = (cookie: string) =>
  request(app).get(`/api/tickets/${ticketId}/internal-notes`).set('Cookie', cookie)

const postComment = (cookie: string, body: unknown) =>
  request(app).post(`/api/tickets/${ticketId}/comments`).set('Cookie', cookie).send(body)

const postNote = (cookie: string, body: unknown) =>
  request(app)
    .post(`/api/tickets/${ticketId}/internal-notes`)
    .set('Cookie', cookie)
    .send(body)

beforeAll(async () => {
  cookies.REQUESTER = await signIn(REQUESTER_EMAIL)
  cookies.IT_STAFF = await signIn(STAFF_EMAIL)
  cookies.ADMINISTRATOR = await signIn(ADMIN_EMAIL)
  otherRequesterCookie = await signIn(OTHER_REQUESTER_EMAIL)
  requesterId = await idFor(REQUESTER_EMAIL)
}, 60_000)

beforeEach(async () => {
  await makeTicket()
})

afterAll(async () => {
  await prisma.publicComment.deleteMany({ where: { ticketId } })
  await prisma.internalNote.deleteMany({ where: { ticketId } })
  await prisma.ticket.deleteMany({ where: { ticketNo: TICKET_NO } })
  await restoreSeededCredentials()
})

describe('API-19 · AC-16 · Public Comments reach all three roles (BR-26)', () => {
  it('lets every role read the thread on this Ticket', async () => {
    await postComment(cookies.REQUESTER, { body: 'I restarted it and it still fails.' })

    for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as Role[]) {
      const response = await comments(cookies[role])
      expect(response.status, role).toBe(200)
      expect(response.body.data).toHaveLength(1)
    }
  })

  it('lets every role post, and records author and time server-side (BR-30)', async () => {
    for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as Role[]) {
      const response = await postComment(cookies[role], { body: `From ${role}.` })
      expect(response.status, role).toBe(201)
      expect(response.body.data.author.role).toBe(role)
      expect(Date.parse(response.body.data.createdAt)).not.toBeNaN()
    }

    expect((await comments(cookies.IT_STAFF)).body.data).toHaveLength(3)
  })

  it('refuses a body that names the author or the timestamp', async () => {
    for (const payload of [
      { body: 'ok', authorId: requesterId },
      { body: 'ok', createdAt: '2020-01-01T00:00:00.000Z' },
    ]) {
      const response = await postComment(cookies.REQUESTER, payload)
      expect(response.status).toBe(400)
    }
  })

  it('answers 404 for another Requester’s Ticket (BR-14)', async () => {
    expect((await comments(otherRequesterCookie)).status).toBe(404)
    expect((await postComment(otherRequesterCookie, { body: 'x'.repeat(5) })).status).toBe(404)
  })

  it('returns the thread oldest first', async () => {
    await postComment(cookies.REQUESTER, { body: 'First message.' })
    await postComment(cookies.IT_STAFF, { body: 'Second message.' })

    const bodies = (await comments(cookies.REQUESTER)).body.data.map(
      (entry: { body: string }) => entry.body,
    )
    expect(bodies).toEqual(['First message.', 'Second message.'])
  })
})

describe('SEC-T05 · AC-09 · a Requester is refused Internal Notes, and learns nothing', () => {
  it('refuses with 403 and a body that carries no note and no count', async () => {
    await postNote(cookies.IT_STAFF, { body: SECRET_NOTE })

    const response = await notes(cookies.REQUESTER)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
    expect(response.body).not.toHaveProperty('data')
    expect(JSON.stringify(response.body)).not.toContain('ZX-4471')
    expect(JSON.stringify(response.body)).not.toMatch(/\b1\b/)
  })

  it('answers identically whether the Ticket has no notes or many', async () => {
    const withNone = await notes(cookies.REQUESTER)

    await postNote(cookies.IT_STAFF, { body: SECRET_NOTE })
    await postNote(cookies.ADMINISTRATOR, { body: 'Second note.' })
    const withSome = await notes(cookies.REQUESTER)

    // The positive control: staff do see the difference.
    expect((await notes(cookies.IT_STAFF)).body.data).toHaveLength(2)

    expect(withSome.status).toBe(withNone.status)
    expect(withSome.body.error.code).toBe(withNone.body.error.code)
    expect(withSome.body.error.message).toBe(withNone.body.error.message)
    expect(withSome.body.error.fieldErrors).toEqual(withNone.body.error.fieldErrors)
  })

  it('refuses the Ticket’s own Requester, not merely a stranger', async () => {
    const response = await notes(cookies.REQUESTER)
    expect(response.status).toBe(403)
  })

  it('SEC-T06 · refuses a Requester writing a note, and writes nothing', async () => {
    const response = await postNote(cookies.REQUESTER, { body: 'Let me in.' })

    expect(response.status).toBe(403)
    expect(await prisma.internalNote.count({ where: { ticketId } })).toBe(0)
  })

  it('refuses an unauthenticated caller with 401 before anything else', async () => {
    const response = await request(app).get(`/api/tickets/${ticketId}/internal-notes`)
    expect(response.status).toBe(401)
  })

  it('logs INTERNAL_NOTE_REFUSED, its own signal rather than the generic FORBIDDEN', async () => {
    // logInternalNoteRefusal existed unwired before this — the refusal above
    // was carrying the same generic FORBIDDEN log as every other 403.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await notes(cookies.REQUESTER)
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('INTERNAL_NOTE_REFUSED'),
      )
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('FORBIDDEN'))
    } finally {
      warn.mockRestore()
    }
  })
})

describe('API-21 · AC-25 · Internal Notes serve IT Staff and Administrator (BR-27)', () => {
  it('lets both read and write, and records the author', async () => {
    for (const role of ['IT_STAFF', 'ADMINISTRATOR'] as Role[]) {
      const response = await postNote(cookies[role], { body: `Note from ${role}.` })
      expect(response.status, role).toBe(201)
      expect(response.body.data.author.role).toBe(role)
    }

    expect((await notes(cookies.IT_STAFF)).body.data).toHaveLength(2)
  })

  it('keeps notes on a Ticket out of the comment thread, and the reverse', async () => {
    await postComment(cookies.IT_STAFF, { body: 'Public update.' })
    await postNote(cookies.IT_STAFF, { body: SECRET_NOTE })

    const publicThread = await comments(cookies.REQUESTER)
    expect(publicThread.body.data).toHaveLength(1)
    expect(JSON.stringify(publicThread.body)).not.toContain('ZX-4471')

    const internalThread = await notes(cookies.IT_STAFF)
    expect(internalThread.body.data).toHaveLength(1)
    expect(JSON.stringify(internalThread.body)).not.toContain('Public update.')
  })
})

describe('UNIT-05 · API-22 · content validation (BR-31, SEC-030)', () => {
  const REJECTED: Array<[string, unknown]> = [
    ['an empty string', ''],
    ['whitespace only', '   \n\t  '],
    ['a missing body', undefined],
    ['a number', 42],
    ['one character over the maximum', 'x'.repeat(MAX_BODY_LENGTH + 1)],
  ]

  for (const [name, body] of REJECTED) {
    it(`refuses ${name} on both threads`, async () => {
      expect((await postComment(cookies.REQUESTER, { body })).status, name).toBe(400)
      expect((await postNote(cookies.IT_STAFF, { body })).status, name).toBe(400)
    })
  }

  it('accepts the boundaries either side of those', async () => {
    expect((await postComment(cookies.REQUESTER, { body: 'x' })).status).toBe(201)
    expect(
      (await postComment(cookies.REQUESTER, { body: 'x'.repeat(MAX_BODY_LENGTH) })).status,
    ).toBe(201)
  })

  it('stores the trimmed content, so leading space is not length', async () => {
    const response = await postComment(cookies.REQUESTER, { body: '  padded  ' })

    expect(response.status).toBe(201)
    expect(response.body.data.body).toBe('padded')
  })

  it('writes nothing when the content is refused', async () => {
    await postComment(cookies.REQUESTER, { body: '   ' })
    expect(await prisma.publicComment.count({ where: { ticketId } })).toBe(0)
  })
})

describe('BR-32 · content is stored as text, never interpreted (SEC-029)', () => {
  const HOSTILE = [
    '<script>alert(1)</script>',
    "'; DROP TABLE \"PublicComment\"; --",
    '<img src=x onerror="alert(1)">',
    '{{constructor.constructor("return 1")()}}',
  ]

  it('stores each verbatim and returns it verbatim', async () => {
    for (const body of HOSTILE) {
      const response = await postComment(cookies.REQUESTER, { body })
      expect(response.status, body).toBe(201)
      // Unescaped and unexecuted: escaping belongs to the renderer, and
      // escaping on the way in would corrupt the text someone actually typed.
      expect(response.body.data.body).toBe(body)
    }

    expect(await prisma.publicComment.count({ where: { ticketId } })).toBe(HOSTILE.length)
  })

  it('leaves the tables standing after the injection-shaped content', async () => {
    await postComment(cookies.REQUESTER, { body: HOSTILE[1] })
    expect(await prisma.publicComment.count()).toBeGreaterThan(0)
  })
})

describe('API-23 · both threads are append-only (BR-29)', () => {
  it('offers no edit or delete route on either', async () => {
    const created = await postComment(cookies.REQUESTER, { body: 'Cannot be edited.' })
    const commentId = created.body.data.id

    for (const method of ['patch', 'put', 'delete'] as const) {
      for (const path of [
        `/api/tickets/${ticketId}/comments/${commentId}`,
        `/api/tickets/${ticketId}/internal-notes/${commentId}`,
      ]) {
        const response = await request(app)[method](path).set('Cookie', cookies.IT_STAFF)
        expect([404, 405], `${method} ${path}`).toContain(response.status)
      }
    }

    expect(await prisma.publicComment.count({ where: { ticketId } })).toBe(1)
  })
})
