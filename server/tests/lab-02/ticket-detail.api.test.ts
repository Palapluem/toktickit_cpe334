// API-19/API-20 · AC-27/AC-28 · BR-15/BR-16/TC-002/TC-003.
// TDT-01 owned/cross-requester partition; TDT-05 forged-header access check.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import prisma from '../../src/prisma.js'
import {
  loadOtherRequester,
  loadTicketReferences,
  resetTicketData,
  type TicketReferences,
  validTicketPayload,
} from './ticket-fixtures.js'

type DetailReferences = TicketReferences & {
  otherRequesterId: string
  otherCookie: string
}

let references: DetailReferences

beforeAll(async () => {
  const base = await loadTicketReferences()
  const other = await loadOtherRequester()
  references = { ...base, otherRequesterId: other.requesterId, otherCookie: other.cookie }
})

beforeEach(async () => {
  await resetTicketData()
})

async function createTicket(sessionCookie = references.cookie): Promise<string> {
  const response = await request(createApp())
    .post('/api/tickets')
    .set('Cookie', sessionCookie)
    .send(validTicketPayload(references))

  expect(response.status).toBe(201)
  return response.body.data.id as string
}

async function seedAttachment(
  ticketId: string,
  overrides: {
    originalFilename?: string
    storedFilename?: string
    removedAt?: Date | null
    removedReason?: string | null
    removedById?: string | null
  } = {},
) {
  const index = await prisma.attachment.count()
  return prisma.attachment.create({
    data: {
      ticketId,
      originalFilename: overrides.originalFilename ?? `evidence-${index}.png`,
      storedFilename:
        overrides.storedFilename ?? `stored-${ticketId}-${index}.bin`,
      mimeType: 'image/png',
      sizeBytes: 128,
      uploadedById: references.requesterId,
      createdAt: new Date('2026-09-01T08:00:00.000Z'),
      removedAt: overrides.removedAt ?? null,
      removedReason: overrides.removedReason ?? null,
      removedById: overrides.removedById ?? null,
    },
  })
}

describe('API-19 · AC-27 · owned Ticket Detail', () => {
  it('returns the read-only ticket fields and active plus removed attachment metadata', async () => {
    const ticketId = await createTicket()
    await seedAttachment(ticketId, { originalFilename: 'active.png' })
    await seedAttachment(ticketId, {
      originalFilename: 'old.png',
      removedAt: new Date('2026-09-01T09:00:00.000Z'),
      removedReason: 'Uploaded the wrong file',
      removedById: references.requesterId,
    })

    const response = await request(createApp())
      .get(`/api/tickets/${ticketId}`)
      .set('Cookie', references.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: ticketId,
      summary: 'Laptop battery drains quickly',
      description: expect.any(String),
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      status: 'NEW',
      owner: null,
    })
    expect(Object.keys(response.body.data).sort()).toEqual([
      'attachments',
      'category',
      'createdAt',
      'description',
      'id',
      'itPriority',
      'owner',
      'relatedSystem',
      'requestedPriority',
      'requester',
      // Added by lab-03 AC-16: the Requester has to be able to see their own
      // "appears resolved" signal on the Ticket they reported.
      'requesterResolvedAt',
      'status',
      'summary',
      'ticketNo',
      'updatedAt',
    ])
    expect(response.body.data.attachments).toHaveLength(2)
    expect(response.body.data.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ originalFilename: 'active.png', removedAt: null }),
        expect.objectContaining({
          originalFilename: 'old.png',
          removedReason: 'Uploaded the wrong file',
          removedAt: '2026-09-01T09:00:00.000Z',
        }),
      ]),
    )
    for (const attachment of response.body.data.attachments) {
      expect(Object.keys(attachment).sort()).toEqual([
        'createdAt',
        'id',
        'mimeType',
        'originalFilename',
        'removedAt',
        'removedReason',
        'sizeBytes',
      ])
    }
  })
})

describe('API-20 · AC-28 · BR-16 · cross-requester Ticket Detail', () => {
  it('returns the not-found envelope instead of another requester’s Ticket', async () => {
    const ticketId = await createTicket()

    const response = await request(createApp())
      .get(`/api/tickets/${ticketId}`)
      .set('Cookie', references.otherCookie)

    expect(response.status).toBe(404)
    expect(response.body.error).toMatchObject({
      code: 'TICKET_NOT_FOUND',
      fieldErrors: [],
    })
  })
})

describe('route parameter validation', () => {
  it('returns the ticket not-found envelope for a malformed Ticket id', async () => {
    const response = await request(createApp())
      .get('/api/tickets/not-a-uuid')
      .set('Cookie', references.cookie)

    expect(response.status).toBe(404)
    expect(response.body.error).toMatchObject({
      code: 'TICKET_NOT_FOUND',
      fieldErrors: [],
    })
  })
})
