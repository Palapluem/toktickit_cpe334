// API-03…API-07 (#20). AC-06…AC-14; BR-04…BR-08, BR-18…BR-25.
// TC-007/009/010/012/024: exercise the HTTP boundary and read PostgreSQL back.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app, { createApp } from '../../src/app.js'
import prisma from '../../src/prisma.js'

const REQUEST = {
  summary: 'Laptop battery drains quickly',
  description:
    "The laptop battery drains much faster than usual even when the system is idle.",
  requestedPriority: 'MEDIUM',
}

let requesterId = ''
let categoryId = ''
let relatedSystemId = ''

beforeAll(async () => {
  const [requester, category, relatedSystem] = await Promise.all([
    prisma.requesterUser.findFirstOrThrow({ where: { isActive: true } }),
    prisma.category.findFirstOrThrow({ where: { isActive: true } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ])

  requesterId = requester.id
  categoryId = category.id
  relatedSystemId = relatedSystem.id
})

beforeEach(async () => {
  await prisma.attachment.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.ticketNumberSequence.deleteMany()
})

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    ...REQUEST,
    categoryId,
    relatedSystemId,
    ...overrides,
  }
}

describe('API-03/API-04 · AC-06…AC-08 · valid Ticket creation', () => {
  it('creates one server-owned Ticket and returns its generated values', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId)
      .send(validPayload())

    expect(response.status).toBe(201)
    expect(response.body.data.ticketNo).toMatch(/^TKT-\d{4}-\d{6}$/)
    expect(response.body.data.status).toBe('NEW')
    expect(response.body.data.itPriority).toBe('MEDIUM')
    expect(response.body.data.owner).toBeNull()
    expect(response.body.data.requester.id).toBe(requesterId)

    const saved = await prisma.ticket.findUnique({
      where: { id: response.body.data.id },
    })
    expect(saved).not.toBeNull()
    expect(saved?.summary).toBe(REQUEST.summary)
    expect(saved?.description).toBe(REQUEST.description)
    expect(saved?.status).toBe('NEW')
    expect(saved?.itPriority).toBe('MEDIUM')
    expect(saved?.ownerId).toBeNull()
    expect(saved?.createdAt).toBeInstanceOf(Date)
  })

  it('trims the persisted fields and binds the row to the header requester', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId)
      .send(
        validPayload({
          summary: '  Printer queue is stuck  ',
          description: '  Print jobs remain queued after restarting the printer.  ',
        }),
      )

    expect(response.status).toBe(201)
    const saved = await prisma.ticket.findUniqueOrThrow({
      where: { id: response.body.data.id },
    })
    expect(saved.requesterId).toBe(requesterId)
    expect(saved.summary).toBe('Printer queue is stuck')
    expect(saved.description).toBe('Print jobs remain queued after restarting the printer.')
  })
})

describe('API-05 · AC-09/AC-10 · server validation', () => {
  it('returns field-level errors and persists nothing for an invalid payload', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId)
      .send({
        categoryId: 'not-a-uuid',
        relatedSystemId: '00000000-0000-4000-8000-000000000000',
        summary: '  x  ',
        description: 'help',
        requestedPriority: 'INVALID',
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_FAILED')
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'categoryId' }),
        expect.objectContaining({ field: 'relatedSystemId' }),
        expect.objectContaining({ field: 'summary' }),
        expect.objectContaining({ field: 'description' }),
        expect.objectContaining({ field: 'requestedPriority' }),
      ]),
    )
    expect(await prisma.ticket.count()).toBe(0)
  })

  it.each([
    ['summary', 'a'.repeat(151)],
    ['description', 'a'.repeat(5001)],
  ])('rejects %s above its documented bound', async (field, value) => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId)
      .send(validPayload({ [field]: value }))

    expect(response.status).toBe(400)
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })]),
    )
    expect(await prisma.ticket.count()).toBe(0)
  })
})

describe('API-06 · BR-18 · server-controlled properties', () => {
  it('rejects every server-controlled or unknown property instead of ignoring it', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId)
      .send(
        validPayload({
          ticketNo: 'TKT-2099-000001',
          ticketDate: '2099-01-01T00:00:00.000Z',
          requesterId: '00000000-0000-4000-8000-000000000000',
          itPriority: 'URGENT',
          status: 'CLOSED',
          ownerId: '00000000-0000-4000-8000-000000000000',
          typo: 'must not be ignored',
        }),
      )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_FAILED')
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'ticketNo' }),
        expect.objectContaining({ field: 'ticketDate' }),
        expect.objectContaining({ field: 'requesterId' }),
        expect.objectContaining({ field: 'itPriority' }),
        expect.objectContaining({ field: 'status' }),
        expect.objectContaining({ field: 'ownerId' }),
        expect.objectContaining({ field: 'typo' }),
      ]),
    )
    expect(await prisma.ticket.count()).toBe(0)
  })
})

describe('API-07 · AC-14/BR-05 · concurrent Ticket Number allocation', () => {
  it('allocates distinct six-digit numbers for genuinely parallel requests', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        request(app)
          .post('/api/tickets')
          .set('X-Requester-Id', requesterId)
          .send(
            validPayload({
              summary: `Concurrent ticket ${index + 1}`,
              description:
                'This request proves that parallel creation does not reuse a number.',
            }),
          ),
      ),
    )

    expect(responses.map((response) => response.status)).toEqual(
      Array(8).fill(201),
    )
    const ticketNumbers = responses.map((response) => response.body.data.ticketNo)
    expect(new Set(ticketNumbers).size).toBe(8)
    expect(ticketNumbers).toEqual(
      expect.arrayContaining([expect.stringMatching(/^TKT-\d{4}-\d{6}$/)]),
    )
    expect(await prisma.ticket.count()).toBe(8)
  })
})

describe('API-07 · TC-024 · the API uses the Bangkok calendar year', () => {
  it('keeps the UTC timestamp while changing the number year at 17:00 UTC', async () => {
    const beforeBoundary = new Date('2026-12-31T16:59:00.000Z')
    const afterBoundary = new Date('2026-12-31T17:00:00.000Z')

    const beforeResponse = await request(
      createApp({ now: () => beforeBoundary }),
    )
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId)
      .send(validPayload({ summary: 'Before Bangkok boundary' }))

    const afterResponse = await request(
      createApp({ now: () => afterBoundary }),
    )
      .post('/api/tickets')
      .set('X-Requester-Id', requesterId)
      .send(validPayload({ summary: 'After Bangkok boundary' }))

    expect(beforeResponse.status).toBe(201)
    expect(afterResponse.status).toBe(201)
    expect(beforeResponse.body.data.ticketNo).toBe('TKT-2026-000001')
    expect(afterResponse.body.data.ticketNo).toBe('TKT-2027-000001')
    expect(afterResponse.body.data.createdAt).toBe(afterBoundary.toISOString())
  })
})
