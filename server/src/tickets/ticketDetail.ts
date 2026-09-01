import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { ApiError } from '../http/errors.js'
import { MAX_ATTACHMENTS, validateAttachment } from './attachmentRules.js'
import prisma from '../prisma.js'
import {
  localAttachmentStorage,
  type AttachmentFile,
  type AttachmentStorage,
} from './storage.js'

const ACTOR_SELECT = {
  id: true,
  displayName: true,
} as const

const ATTACHMENT_INCLUDE = {
  uploadedBy: { select: ACTOR_SELECT },
  removedBy: { select: ACTOR_SELECT },
} as const

const TICKET_DETAIL_INCLUDE = {
  requester: { select: ACTOR_SELECT },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  attachments: {
    orderBy: { createdAt: 'asc' },
    include: ATTACHMENT_INCLUDE,
  },
} as const

type AttachmentRecord = Prisma.AttachmentGetPayload<{
  include: typeof ATTACHMENT_INCLUDE
}>

type TicketDetailRecord = Prisma.TicketGetPayload<{
  include: typeof TICKET_DETAIL_INCLUDE
}>

export type TicketDetailOptions = {
  db?: PrismaClient
  storage?: AttachmentStorage
  now?: () => Date
}

export type AttachmentResponse = {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  uploadedBy: { id: string; displayName: string }
  createdAt: Date
  removedAt: Date | null
  removedReason: string | null
  removedBy: { id: string; displayName: string } | null
  isDownloadable: boolean
}

function ticketNotFound(): ApiError {
  return new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.')
}

function attachmentNotFound(): ApiError {
  return new ApiError(404, 'ATTACHMENT_NOT_FOUND', 'Attachment not found.')
}

function mapAttachment(attachment: AttachmentRecord): AttachmentResponse {
  return {
    id: attachment.id,
    originalFilename: attachment.originalFilename,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploadedBy: attachment.uploadedBy,
    createdAt: attachment.createdAt,
    removedAt: attachment.removedAt,
    removedReason: attachment.removedReason,
    removedBy: attachment.removedBy,
    isDownloadable: attachment.removedAt === null,
  }
}

function mapTicket(ticket: TicketDetailRecord) {
  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    summary: ticket.summary,
    description: ticket.description,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    status: ticket.status,
    requester: ticket.requester,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    owner: null,
    attachments: ticket.attachments.map(mapAttachment),
    attachmentFailures: [],
  }
}

async function findOwnedTicket(
  ticketId: string,
  requesterId: string,
  db: PrismaClient,
) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, requesterId },
    select: { id: true },
  })
  if (!ticket) throw ticketNotFound()
  return ticket
}

export async function getTicketDetail(
  ticketId: string,
  requesterId: string,
  db: PrismaClient,
) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, requesterId },
    include: TICKET_DETAIL_INCLUDE,
  })
  if (!ticket) throw ticketNotFound()
  return mapTicket(ticket)
}

export async function listTicketAttachments(
  ticketId: string,
  requesterId: string,
  db: PrismaClient,
) {
  await findOwnedTicket(ticketId, requesterId, db)
  const [attachments, activeCount] = await Promise.all([
    db.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: ATTACHMENT_INCLUDE,
    }),
    db.attachment.count({ where: { ticketId, removedAt: null } }),
  ])
  return {
    data: attachments.map(mapAttachment),
    activeCount,
    activeLimit: MAX_ATTACHMENTS,
  }
}

export async function addTicketAttachment(
  ticketId: string,
  requesterId: string,
  file: AttachmentFile | undefined,
  options: TicketDetailOptions = {},
) {
  const db = options.db ?? prisma
  await findOwnedTicket(ticketId, requesterId, db)

  if (!file) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'An attachment file is required.',
      [{ field: 'attachment', message: 'Choose a file to upload.' }],
    )
  }

  const failure = validateAttachment(file, 0)
  if (failure) {
    throw new ApiError(
      failure.status,
      failure.code,
      failure.message,
      [{ field: 'attachment', message: failure.message }],
    )
  }

  const activeCount = await db.attachment.count({
    where: { ticketId, removedAt: null },
  })
  if (activeCount >= MAX_ATTACHMENTS) {
    throw new ApiError(
      409,
      'ATTACHMENT_LIMIT_REACHED',
      `A Ticket can have at most ${MAX_ATTACHMENTS} active attachments.`,
    )
  }

  const storage = options.storage ?? localAttachmentStorage
  const { storedFilename } = await storage.save(file)
  const createdAt = (options.now ?? (() => new Date()))()

  try {
    const attachment = await db.attachment.create({
      data: {
        ticketId,
        originalFilename: file.originalFilename,
        storedFilename,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        uploadedById: requesterId,
        createdAt,
      },
      include: ATTACHMENT_INCLUDE,
    })
    return {
      data: mapAttachment(attachment),
      activeCount: activeCount + 1,
      activeLimit: MAX_ATTACHMENTS,
    }
  } catch (error) {
    await storage.remove(storedFilename).catch(() => undefined)
    throw error
  }
}

export async function removeTicketAttachment(
  attachmentId: string,
  requesterId: string,
  reason: unknown,
  options: TicketDetailOptions = {},
) {
  const db = options.db ?? prisma
  const attachment = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      ticket: { requesterId },
    },
    include: {
      ...ATTACHMENT_INCLUDE,
      ticket: { select: { id: true } },
    },
  })
  if (!attachment) throw attachmentNotFound()

  const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
  if (trimmedReason.length < 3 || trimmedReason.length > 200) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'A removal reason is required and must be 3–200 characters.',
      [{ field: 'reason', message: 'Enter a reason between 3 and 200 characters.' }],
    )
  }

  if (attachment.removedAt) {
    const activeCount = await db.attachment.count({
      where: { ticketId: attachment.ticket.id, removedAt: null },
    })
    return {
      data: mapAttachment(attachment),
      activeCount,
      activeLimit: MAX_ATTACHMENTS,
    }
  }

  const removedAt = (options.now ?? (() => new Date()))()
  const removed = await db.attachment.update({
    where: { id: attachmentId },
    data: {
      removedAt,
      removedReason: trimmedReason,
      removedById: requesterId,
    },
    include: {
      ...ATTACHMENT_INCLUDE,
      ticket: { select: { id: true } },
    },
  })
  const activeCount = await db.attachment.count({
    where: { ticketId: removed.ticket.id, removedAt: null },
  })
  return {
    data: mapAttachment(removed),
    activeCount,
    activeLimit: MAX_ATTACHMENTS,
  }
}

export async function downloadTicketAttachment(
  attachmentId: string,
  requesterId: string,
  options: TicketDetailOptions = {},
) {
  const db = options.db ?? prisma
  const attachment = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      ticket: { requesterId },
    },
    include: ATTACHMENT_INCLUDE,
  })
  if (!attachment) throw attachmentNotFound()
  if (attachment.removedAt) {
    throw new ApiError(
      410,
      'ATTACHMENT_REMOVED',
      'This attachment has been removed and is no longer downloadable.',
    )
  }

  const storage = options.storage ?? localAttachmentStorage
  const getStream = storage.getStream
  if (!getStream) throw new Error('Attachment storage does not support downloads.')
  return {
    attachment: mapAttachment(attachment),
    stream: await getStream.call(storage, attachment.storedFilename),
  }
}
