// API-08…API-10 (#20). AC-15…AC-17; BR-26, BR-27, BR-34, BR-35.
// TC-013/015/022/023: rule failures reject before persistence; storage failures keep the Ticket.
// TDT-01 equivalence partitions; TDT-02 boundary-value analysis; TDT-05 error guessing for storage failures.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import prisma from '../../src/prisma.js'
import type { AttachmentFile, AttachmentStorage } from '../../src/tickets/storage.js'
import {
  BASE_TICKET_PAYLOAD,
  loadTicketReferences,
  resetTicketData,
  type TicketReferences,
} from './ticket-fixtures.js'

let references: TicketReferences

beforeAll(async () => {
  references = await loadTicketReferences()
})

beforeEach(async () => {
  await resetTicketData()
})

function multipart(app: ReturnType<typeof createApp>) {
  return request(app)
    .post('/api/tickets')
    .set('X-Requester-Id', references.requesterId)
    .field('categoryId', references.categoryId)
    .field('relatedSystemId', references.relatedSystemId)
    .field('summary', BASE_TICKET_PAYLOAD.summary)
    .field('description', BASE_TICKET_PAYLOAD.description)
    .field('requestedPriority', BASE_TICKET_PAYLOAD.requestedPriority)
}

describe('API-08 · AC-15 · a permitted attachment is stored with metadata', () => {
  it('creates the Ticket and returns the active attachment', async () => {
    const storage: AttachmentStorage = {
      save: vi.fn(async () => ({ storedFilename: 'generated-file-name' })),
      remove: vi.fn(async () => {}),
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

  it('accepts exactly five permitted attachments at the count boundary', async () => {
    const storage: AttachmentStorage = {
      save: vi.fn(async (file: AttachmentFile) => ({
        storedFilename: `stored-${file.originalFilename}`,
      })),
      remove: vi.fn(async () => {}),
    }
    let upload = multipart(createApp({ storage }))
    for (let index = 0; index < 5; index += 1) {
      upload = upload.attach(
        'attachments',
        Buffer.from(`file-${index}`),
        { filename: `file-${index}.png`, contentType: 'image/png' },
      )
    }

    const response = await upload

    expect(response.status).toBe(201)
    expect(response.body.data.attachments).toHaveLength(5)
    expect(response.body.data.attachments.map((file: { originalFilename: string }) => file.originalFilename))
      .toEqual([
        'file-0.png',
        'file-1.png',
        'file-2.png',
        'file-3.png',
        'file-4.png',
      ])
    expect(await prisma.attachment.count()).toBe(5)
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
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('payload.exe'),
        }),
      ]),
    )
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
    expect(response.body.error.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('too-large.pdf'),
        }),
      ]),
    )
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
      remove: vi.fn(async () => {}),
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

  it('removes a stored file when its metadata row cannot be created', async () => {
    const remove = vi.fn(async () => {})
    const storage: AttachmentStorage = {
      save: vi.fn(async () => ({ storedFilename: 'same-stored-name' })),
      remove,
    }

    const response = await multipart(createApp({ storage }))
      .attach('attachments', Buffer.from('first'), {
        filename: 'first.png',
        contentType: 'image/png',
      })
      .attach('attachments', Buffer.from('second'), {
        filename: 'second.png',
        contentType: 'image/png',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.attachments).toHaveLength(1)
    expect(response.body.data.attachmentFailures).toEqual([
      {
        originalFilename: 'second.png',
        reason: 'STORAGE_WRITE_FAILED',
      },
    ])
    expect(remove).toHaveBeenCalledWith('same-stored-name')
    expect(await prisma.attachment.count()).toBe(1)
  })
})
