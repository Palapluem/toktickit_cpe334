// API-08…API-10 (#20). AC-15…AC-17; BR-26, BR-27, BR-34, BR-35.
// TC-013/015/022/023; TDT-01/02 partitions and boundaries; TDT-05 storage failures.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Readable } from 'node:stream'
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
let otherRequesterId: string

beforeAll(async () => {
  references = await loadTicketReferences()
  const other = await prisma.requesterUser.findFirstOrThrow({
    where: { isActive: true, id: { not: references.requesterId } },
    select: { id: true },
  })
  otherRequesterId = other.id
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

async function createExistingTicket(): Promise<string> {
  const response = await request(createApp())
    .post('/api/tickets')
    .set('X-Requester-Id', references.requesterId)
    .field('categoryId', references.categoryId)
    .field('relatedSystemId', references.relatedSystemId)
    .field('summary', BASE_TICKET_PAYLOAD.summary)
    .field('description', BASE_TICKET_PAYLOAD.description)
    .field('requestedPriority', BASE_TICKET_PAYLOAD.requestedPriority)

  expect(response.status).toBe(201)
  return response.body.data.id as string
}

async function seedAttachment(
  ticketId: string,
  overrides: {
    originalFilename?: string
    storedFilename?: string
    sizeBytes?: number
    removedAt?: Date | null
    removedReason?: string | null
    removedById?: string | null
    uploadedById?: string
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
      sizeBytes: overrides.sizeBytes ?? 128,
      uploadedById: overrides.uploadedById ?? references.requesterId,
      createdAt: new Date('2026-09-01T08:00:00.000Z'),
      removedAt: overrides.removedAt ?? null,
      removedReason: overrides.removedReason ?? null,
      removedById: overrides.removedById ?? null,
    },
  })
}

async function seedActiveAttachments(ticketId: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    await seedAttachment(ticketId, {
      originalFilename: `active-${index}.png`,
      storedFilename: `active-stored-${ticketId}-${index}`,
    })
  }
}

function downloadStorage(content = Buffer.from('downloaded attachment')) {
  return {
    save: vi.fn(async () => ({ storedFilename: 'generated-download-name' })),
    remove: vi.fn(async () => {}),
    getStream: vi.fn(async () => Readable.from([content])),
  }
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
    expect(Object.keys(response.body.data).sort()).toEqual([
      'attachmentFailures',
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
      'status',
      'summary',
      'ticketNo',
      'updatedAt',
    ])
    expect(Object.keys(response.body.data.attachments[0]).sort()).toEqual([
      'createdAt',
      'id',
      'mimeType',
      'originalFilename',
      'removedAt',
      'sizeBytes',
    ])
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

describe('API-21 · AC-29 · add attachment to an owned Ticket', () => {
  it('stores one permitted attachment and returns its active metadata', async () => {
    const ticketId = await createExistingTicket()
    const storage = downloadStorage()

    const response = await request(createApp({ storage }))
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('X-Requester-Id', references.requesterId)
      .attach('attachment', Buffer.from('new image bytes'), {
        filename: 'new-image.png',
        contentType: 'image/png',
      })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      originalFilename: 'new-image.png',
      mimeType: 'image/png',
      sizeBytes: 15,
      removedAt: null,
      isDownloadable: true,
    })
    expect(response.body.activeCount).toBe(1)
    expect(response.body.activeLimit).toBe(5)
    expect(await prisma.attachment.count({ where: { ticketId } })).toBe(1)
  })
})

describe('API-22 · AC-30 · BR-28 · active attachment limit', () => {
  it('rejects a sixth active attachment without saving another file', async () => {
    const ticketId = await createExistingTicket()
    await seedActiveAttachments(ticketId, 5)
    const storage = downloadStorage()

    const response = await request(createApp({ storage }))
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('X-Requester-Id', references.requesterId)
      .attach('attachment', Buffer.from('sixth file'), {
        filename: 'sixth.png',
        contentType: 'image/png',
      })

    expect(response.status).toBe(409)
    expect(response.body.error).toMatchObject({
      code: 'ATTACHMENT_LIMIT_REACHED',
      fieldErrors: [],
    })
    expect(storage.save).not.toHaveBeenCalled()
    expect(await prisma.attachment.count({ where: { ticketId, removedAt: null } })).toBe(5)
  })

  it('serializes concurrent uploads so the active count cannot exceed five', async () => {
    const ticketId = await createExistingTicket()
    await seedActiveAttachments(ticketId, 4)
    const storage: AttachmentStorage = {
      save: vi.fn(async (file: AttachmentFile) => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        return { storedFilename: `concurrent-${file.originalFilename}` }
      }),
      remove: vi.fn(async () => {}),
    }

    const responses = await Promise.all([
      request(createApp({ storage }))
        .post(`/api/tickets/${ticketId}/attachments`)
        .set('X-Requester-Id', references.requesterId)
        .attach('attachment', Buffer.from('first'), {
          filename: 'first.png',
          contentType: 'image/png',
        }),
      request(createApp({ storage }))
        .post(`/api/tickets/${ticketId}/attachments`)
        .set('X-Requester-Id', references.requesterId)
        .attach('attachment', Buffer.from('second'), {
          filename: 'second.png',
          contentType: 'image/png',
        }),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
    expect(
      await prisma.attachment.count({ where: { ticketId, removedAt: null } }),
    ).toBe(5)
  })
})

describe('API-23 · BR-28 · removed attachments do not count toward the limit', () => {
  it('allows a new upload after one of five attachments is removed', async () => {
    const ticketId = await createExistingTicket()
    await seedActiveAttachments(ticketId, 4)
    await seedAttachment(ticketId, {
      originalFilename: 'removed.png',
      storedFilename: `removed-stored-${ticketId}`,
      removedAt: new Date('2026-09-01T09:00:00.000Z'),
      removedReason: 'No longer needed',
      removedById: references.requesterId,
    })
    const storage = downloadStorage()

    const response = await request(createApp({ storage }))
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('X-Requester-Id', references.requesterId)
      .attach('attachment', Buffer.from('replacement bytes'), {
        filename: 'replacement.png',
        contentType: 'image/png',
      })

    expect(response.status).toBe(201)
    expect(response.body.activeCount).toBe(5)
    expect(await prisma.attachment.count({ where: { ticketId, removedAt: null } })).toBe(5)
  })
})

describe('API-24 · AC-31 · active attachment download', () => {
  it('streams the content as a download with safe response headers', async () => {
    const ticketId = await createExistingTicket()
    const content = Buffer.from('downloaded attachment')
    const attachment = await seedAttachment(ticketId, {
      originalFilename: 'report.png',
      storedFilename: `generated-${ticketId}`,
      sizeBytes: content.length,
    })
    const storage = downloadStorage(content)

    const response = await request(createApp({ storage }))
      .get(`/api/attachments/${attachment.id}/download`)
      .set('X-Requester-Id', references.requesterId)

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toMatch(/^image\/png/)
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="report\.png"$/,
    )
    expect(response.headers['content-length']).toBe(String(content.length))
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.body).toEqual(content)
    expect(storage.getStream).toHaveBeenCalledWith(`generated-${ticketId}`)
  })

  it('encodes non-ASCII filenames without exposing an invalid header', async () => {
    const ticketId = await createExistingTicket()
    const attachment = await seedAttachment(ticketId, {
      originalFilename: 'หลักฐานการแจ้งปัญหา.png',
      storedFilename: `unicode-${ticketId}`,
      sizeBytes: 3,
    })
    const storage = downloadStorage(Buffer.from('pdf'))

    const response = await request(createApp({ storage }))
      .get(`/api/attachments/${attachment.id}/download`)
      .set('X-Requester-Id', references.requesterId)

    expect(response.status).toBe(200)
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''%/,
    )
  })
})

describe('API-25 · AC-32 · BR-31 · soft removal', () => {
  it('retains the row and records the reason, timestamp, and remover', async () => {
    const ticketId = await createExistingTicket()
    const attachment = await seedAttachment(ticketId, {
      originalFilename: 'to-remove.png',
      storedFilename: `remove-me-${ticketId}`,
    })

    const response = await request(createApp())
      .delete(`/api/attachments/${attachment.id}`)
      .set('X-Requester-Id', references.requesterId)
      .send({ reason: 'Uploaded the wrong file' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: attachment.id,
      originalFilename: 'to-remove.png',
      removedReason: 'Uploaded the wrong file',
      isDownloadable: false,
      removedBy: { id: references.requesterId },
    })
    const stored = await prisma.attachment.findUniqueOrThrow({
      where: { id: attachment.id },
    })
    expect(stored.removedAt).not.toBeNull()
    expect(stored.removedReason).toBe('Uploaded the wrong file')
    expect(stored.removedById).toBe(references.requesterId)
  })

  it('returns the existing removal record when removal is repeated', async () => {
    const ticketId = await createExistingTicket()
    const attachment = await seedAttachment(ticketId, {
      removedAt: new Date('2026-09-01T09:00:00.000Z'),
      removedReason: 'Uploaded the wrong file',
      removedById: references.requesterId,
    })

    const response = await request(createApp())
      .delete(`/api/attachments/${attachment.id}`)
      .set('X-Requester-Id', references.requesterId)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      id: attachment.id,
      removedReason: 'Uploaded the wrong file',
      isDownloadable: false,
    })
  })
})

describe('API-26 · AC-33 · BR-33 · removed attachment download', () => {
  it('returns 410 and never asks storage for removed content', async () => {
    const ticketId = await createExistingTicket()
    const attachment = await seedAttachment(ticketId, {
      originalFilename: 'removed.pdf',
      storedFilename: `removed-file-${ticketId}`,
      removedAt: new Date('2026-09-01T09:00:00.000Z'),
      removedReason: 'No longer needed',
      removedById: references.requesterId,
    })
    const storage = downloadStorage()

    const response = await request(createApp({ storage }))
      .get(`/api/attachments/${attachment.id}/download`)
      .set('X-Requester-Id', references.requesterId)

    expect(response.status).toBe(410)
    expect(response.body.error).toMatchObject({
      code: 'ATTACHMENT_REMOVED',
      fieldErrors: [],
    })
    expect(storage.getStream).not.toHaveBeenCalled()
  })
})

describe('route parameter validation', () =>
  it('returns the attachment not-found envelope for a malformed attachment id', async () => {
    const response = await request(createApp())
      .get('/api/attachments/not-a-uuid/download')
      .set('X-Requester-Id', references.requesterId)

    expect(response.status).toBe(404)
    expect(response.body.error).toMatchObject({
      code: 'ATTACHMENT_NOT_FOUND',
      fieldErrors: [],
    })
  })
)

describe('API-27 · BR-32 · removal reason validation', () => {
  it.each([
    { label: 'missing', body: {} },
    { label: 'too short', body: { reason: 'no' } },
  ])('rejects a $label reason without removing the attachment', async ({ body }) => {
    const ticketId = await createExistingTicket()
    const attachment = await seedAttachment(ticketId)

    const response = await request(createApp())
      .delete(`/api/attachments/${attachment.id}`)
      .set('X-Requester-Id', references.requesterId)
      .send(body)

    expect(response.status).toBe(400)
    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: expect.arrayContaining([
        expect.objectContaining({ field: 'reason' }),
      ]),
    })
    const stored = await prisma.attachment.findUniqueOrThrow({
      where: { id: attachment.id },
    })
    expect(stored.removedAt).toBeNull()
  })
})

describe('API-28 · AC-34 · BR-17 · cross-requester attachment access', () => {
  it('refuses metadata, download, and removal for another requester', async () => {
    const ticketId = await createExistingTicket()
    const attachment = await seedAttachment(ticketId, {
      originalFilename: 'private.png',
      storedFilename: `private-file-${ticketId}`,
    })
    const storage = downloadStorage()

    const metadata = await request(createApp())
      .get(`/api/tickets/${ticketId}/attachments`)
      .set('X-Requester-Id', otherRequesterId)
    const download = await request(createApp({ storage }))
      .get(`/api/attachments/${attachment.id}/download`)
      .set('X-Requester-Id', otherRequesterId)
    const removal = await request(createApp())
      .delete(`/api/attachments/${attachment.id}`)
      .set('X-Requester-Id', otherRequesterId)
      .send({ reason: 'Should not be allowed' })

    expect(metadata.status).toBe(404)
    expect(metadata.body.error).toMatchObject({ code: 'TICKET_NOT_FOUND' })
    expect(download.status).toBe(404)
    expect(download.body.error).toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' })
    expect(removal.status).toBe(404)
    expect(removal.body.error).toMatchObject({ code: 'ATTACHMENT_NOT_FOUND' })
    expect(storage.getStream).not.toHaveBeenCalled()
  })
})

describe('API-29 · BR-30 · generated stored filename', () => {
  it('persists the adapter-generated name instead of the uploaded filename', async () => {
    const ticketId = await createExistingTicket()
    const storage = {
      save: vi.fn(async () => ({ storedFilename: 'generated-safe-name' })),
      remove: vi.fn(async () => {}),
    }

    const response = await request(createApp({ storage }))
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('X-Requester-Id', references.requesterId)
      .attach('attachment', Buffer.from('safe bytes'), {
        filename: 'user-visible-name.pdf',
        contentType: 'application/pdf',
      })

    expect(response.status).toBe(201)
    const stored = await prisma.attachment.findFirstOrThrow({
      where: { ticketId },
    })
    expect(stored.storedFilename).toBe('generated-safe-name')
    expect(stored.storedFilename).not.toBe('user-visible-name.pdf')
  })
})
