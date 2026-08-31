import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { ApiError, type FieldError } from '../http/errors.js'
import prisma from '../prisma.js'
import {
  MAX_ATTACHMENTS,
  validateAttachment,
} from './attachmentRules.js'
import { bangkokYear, formatTicketNumber } from './ticketNumber.js'
import {
  localAttachmentStorage,
  type AttachmentFile,
  type AttachmentStorage,
} from './storage.js'
import {
  UUID,
  validateCreateTicketBody,
} from './validation.js'

export type CreateTicketInput = {
  requesterId: string
  body: unknown
  attachments?: AttachmentFile[]
}

export type CreateTicketOptions = {
  db?: PrismaClient
  now?: () => Date
  storage?: AttachmentStorage
}

export class TicketCreationError extends ApiError {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(status, code, message, fieldErrors)
    this.name = 'TicketCreationError'
  }
}

type AttachmentFailure = {
  originalFilename: string
  reason: 'STORAGE_WRITE_FAILED'
}

export async function createTicket(
  input: CreateTicketInput,
  options: CreateTicketOptions = {},
): Promise<{ id: string; attachmentFailures: AttachmentFailure[] }> {
  const { value, errors } = validateCreateTicketBody(input.body)
  if (!value) {
    throw new TicketCreationError(
      400,
      'VALIDATION_FAILED',
      'One or more fields are invalid.',
      errors,
    )
  }

  const attachments = input.attachments ?? []
  if (attachments.length > MAX_ATTACHMENTS) {
    errors.push({
      field: 'attachments',
      message: `A Ticket can have at most ${MAX_ATTACHMENTS} attachments.`,
    })
  }
  const ruleFailures = attachments
    .slice(0, MAX_ATTACHMENTS)
    .map((file, index) => validateAttachment(file, index))
    .filter((failure) => failure !== null)

  if (ruleFailures.length > 0) {
    errors.push(
      ...ruleFailures.map(({ field, message }) => ({ field, message })),
    )
  }

  const db = options.db ?? prisma
  const now = options.now ?? (() => new Date())
  const createdAt = now()
  const [category, relatedSystem] = await Promise.all([
    UUID.test(value.categoryId)
      ? db.category.findFirst({
          where: { id: value.categoryId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    UUID.test(value.relatedSystemId)
      ? db.relatedSystem.findFirst({
          where: { id: value.relatedSystemId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  const referenceErrors: FieldError[] = []
  if (!category) {
    referenceErrors.push({
      field: 'categoryId',
      message: 'Choose an active category.',
    })
  }
  if (!relatedSystem) {
    referenceErrors.push({
      field: 'relatedSystemId',
      message: 'Choose an active related system.',
    })
  }
  if (errors.length > 0 || referenceErrors.length > 0) {
    const firstRuleFailure = ruleFailures[0]
    throw new TicketCreationError(
      firstRuleFailure && errors.length === ruleFailures.length
        ? firstRuleFailure.status
        : 400,
      firstRuleFailure && errors.length === ruleFailures.length
        ? firstRuleFailure.code
        : 'VALIDATION_FAILED',
      firstRuleFailure && errors.length === ruleFailures.length
        ? firstRuleFailure.message
        : 'One or more fields are invalid.',
      [...errors, ...referenceErrors],
    )
  }

  const ticket = await db.$transaction(async (tx) => {
    const year = bangkokYear(createdAt)
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO "TicketNumberSequence" ("year", "lastValue", "updatedAt") VALUES (${year}, 0, ${createdAt}) ON CONFLICT ("year") DO NOTHING`,
    )
    const rows = await tx.$queryRaw<{ lastValue: number }[]>(
      Prisma.sql`UPDATE "TicketNumberSequence" SET "lastValue" = "lastValue" + 1, "updatedAt" = ${createdAt} WHERE "year" = ${year} RETURNING "lastValue"`,
    )
    const sequence = Number(rows[0]?.lastValue ?? 0)
    const ticketNo = formatTicketNumber(year, sequence)

    return tx.ticket.create({
      data: {
        ticketNo,
        requesterId: input.requesterId,
        categoryId: value.categoryId,
        relatedSystemId: value.relatedSystemId,
        summary: value.summary,
        description: value.description,
        requestedPriority: value.requestedPriority,
        itPriority: value.requestedPriority,
        status: 'NEW',
        ownerId: null,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true },
    })
  })

  const storage = options.storage ?? localAttachmentStorage
  const attachmentFailures: AttachmentFailure[] = []
  for (const file of attachments) {
    try {
      const { storedFilename } = await storage.save(file)
      try {
        await db.attachment.create({
          data: {
            ticketId: ticket.id,
            originalFilename: file.originalFilename,
            storedFilename,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            uploadedById: input.requesterId,
            createdAt,
          },
        })
      } catch (error) {
        await storage.remove(storedFilename).catch(() => undefined)
        throw error
      }
    } catch {
      attachmentFailures.push({
        originalFilename: file.originalFilename,
        reason: 'STORAGE_WRITE_FAILED',
      })
    }
  }

  return { id: ticket.id, attachmentFailures }
}
