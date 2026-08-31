import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { FieldError, sendError } from '../http/errors.js'
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

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const ACCEPTED_FIELDS = new Set([
  'categoryId',
  'relatedSystemId',
  'summary',
  'description',
  'requestedPriority',
  'attachments',
])

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

export class TicketCreationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: FieldError[] = [],
  ) {
    super(message)
    this.name = 'TicketCreationError'
  }
}

type ValidatedInput = {
  categoryId: string
  relatedSystemId: string
  summary: string
  description: string
  requestedPriority: (typeof PRIORITIES)[number]
}

type AttachmentFailure = {
  originalFilename: string
  reason: 'STORAGE_WRITE_FAILED'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateBody(body: unknown): {
  value?: ValidatedInput
  errors: FieldError[]
} {
  const errors: FieldError[] = []
  if (!isRecord(body)) {
    return {
      errors: [{ field: 'body', message: 'Request body must be an object.' }],
    }
  }

  for (const key of Object.keys(body)) {
    if (!ACCEPTED_FIELDS.has(key)) {
      errors.push({ field: key, message: 'This property is not accepted.' })
    }
  }

  const stringField = (field: string): string => {
    const raw = body[field]
    if (typeof raw !== 'string') {
      errors.push({ field, message: 'This field is required.' })
      return ''
    }
    return raw.trim()
  }

  const categoryId = stringField('categoryId')
  const relatedSystemId = stringField('relatedSystemId')
  const summary = stringField('summary')
  const description = stringField('description')
  const requestedPriority = stringField('requestedPriority')

  if (categoryId && !UUID.test(categoryId)) {
    errors.push({ field: 'categoryId', message: 'Choose a valid category.' })
  }
  if (relatedSystemId && !UUID.test(relatedSystemId)) {
    errors.push({
      field: 'relatedSystemId',
      message: 'Choose a valid related system.',
    })
  }
  if (summary.length < 5 || summary.length > 150) {
    errors.push({
      field: 'summary',
      message: 'Summary must be between 5 and 150 characters.',
    })
  }
  if (description.length < 10 || description.length > 5000) {
    errors.push({
      field: 'description',
      message: 'Description must be between 10 and 5000 characters.',
    })
  }
  if (!PRIORITIES.includes(requestedPriority as (typeof PRIORITIES)[number])) {
    errors.push({
      field: 'requestedPriority',
      message: 'Choose LOW, MEDIUM, HIGH, or URGENT.',
    })
  }

  return {
    value: {
      categoryId,
      relatedSystemId,
      summary,
      description,
      requestedPriority: requestedPriority as (typeof PRIORITIES)[number],
    },
    errors,
  }
}

export async function createTicket(
  input: CreateTicketInput,
  options: CreateTicketOptions = {},
): Promise<{ id: string; attachmentFailures: AttachmentFailure[] }> {
  const { value, errors } = validateBody(input.body)
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
    } catch {
      attachmentFailures.push({
        originalFilename: file.originalFilename,
        reason: 'STORAGE_WRITE_FAILED',
      })
    }
  }

  return { id: ticket.id, attachmentFailures }
}

export function sendTicketCreationError(
  error: TicketCreationError,
  res: Parameters<typeof sendError>[0],
): void {
  sendError(res, error.status, error.code, error.message, error.fieldErrors)
}
