// API-08…API-10 (#20). AC-15…AC-17; BR-26, BR-27, BR-34, BR-35.
// TC-013/022/023: rule failures reject before persistence; storage failures keep the Ticket.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import prisma from '../../src/prisma.js'
import type { AttachmentStorage } from '../../src/tickets/storage.js'

const REQUEST = {
  summary: 'Attachment upload test',
  description: 'This ticket exists to exercise creation-time file handling.',
  requestedPriority: 'HIGH',
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

function multipart(app: ReturnType<typeof createApp>) {
  return request(app)
    .post('/api/tickets')
    .set('X-Requester-Id', requesterId)
    .field('categoryId', categoryId)
    .field('relatedSystemId', relatedSystemId)
    .field('summary', REQUEST.summary)
    .field('description', REQUEST.description)
    .field('requestedPriority', REQUEST.requestedPriority)
}

describe('API-08 · AC-15 · a permitted attachment is stored with metadata', () => {
  it('creates the Ticket and returns the active attachment', async () => {
    const storage: AttachmentStorage = {
      save: vi.fn(async () => ({ storedFilename: 'generated-file-name' })),
    }

    const response = await multipart(createApp({ storage })).attach(
      'attachments',
      Buffer.from('fake png bytes'),
      { filename: 'screen.png', contentType: 'image/png' },
    )

    expect(response.status).toBe(201)
    expect(response.body.data.attachments).toHaveLength(1)
    expect(response.body.data.attachments[0]).toMatchObject({
      originalFilename: 'screen.png',
      mimeType: 'image/png',
      sizeBytes: 14,
      removedAt: null,
    })
    expect(await prisma.attachment.count()).toBe(1)
  })
})

describe('API-09/API-10 · AC-16/AC-17/BR-34 · rule violations are atomic', () => {
  it('rejects a disallowed type before creating a Ticket', async () => {
    const response = await multipart(createApp()).attach(
      'attachments',
      Buffer.from('executable bytes'),
      { filename: 'payload.exe', contentType: 'application/octet-stream' },
    )

    expect(response.status).toBe(415)
    expect(response.body.error.code).toBe('UNSUPPORTED_FILE_TYPE')
    expect(await prisma.ticket.count()).toBe(0)
    expect(await prisma.attachment.count()).toBe(0)
  })

  it('rejects an oversized file before creating a Ticket', async () => {
    const response = await multipart(createApp()).attach(
      'attachments',
      Buffer.alloc(5 * 1024 * 1024 + 1),
      { filename: 'too-large.pdf', contentType: 'application/pdf' },
    )

    expect(response.status).toBe(413)
    expect(response.body.error.code).toBe('FILE_TOO_LARGE')
    expect(await prisma.ticket.count()).toBe(0)
    expect(await prisma.attachment.count()).toBe(0)
  })

  it('rejects a sixth file at the creation boundary', async () => {
    let upload = multipart(createApp())
    for (let index = 0; index < 6; index += 1) {
      upload = upload.attach(
        'attachments',
        Buffer.from(`file-${index}`),
        { filename: `file-${index}.png`, contentType: 'image/png' },
      )
    }

    const response = await upload
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_FAILED')
    expect(await prisma.ticket.count()).toBe(0)
  })
})

describe('API-08 · TC-023 · storage failure keeps the Ticket', () => {
  it('reports the failed file without persisting an Attachment row', async () => {
    const storage: AttachmentStorage = {
      save: vi.fn(async () => {
        throw new Error('simulated disk failure')
      }),
    }

    const response = await multipart(createApp({ storage })).attach(
      'attachments',
      Buffer.from('fake pdf bytes'),
      { filename: 'evidence.pdf', contentType: 'application/pdf' },
    )

    expect(response.status).toBe(201)
    expect(response.body.data.attachments).toEqual([])
    expect(response.body.data.attachmentFailures).toEqual([
      {
        originalFilename: 'evidence.pdf',
        reason: 'STORAGE_WRITE_FAILED',
      },
    ])
    expect(await prisma.ticket.count()).toBe(1)
    expect(await prisma.attachment.count()).toBe(0)
  })
})
