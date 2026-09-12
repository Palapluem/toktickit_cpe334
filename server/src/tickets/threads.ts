// Public Comments and Internal Notes (api-spec.md §6, §7).
//
// Two tables and two functions rather than one with a visibility flag. A flag
// makes "who may see this" a value someone can get wrong at a call site; two
// stores make it a type error.
import { type PrismaClient } from '../generated/prisma/client.js'
import { ApiError, type FieldError } from '../http/errors.js'
import { logSecurityEvent } from '../http/securityLog.js'
import type { Scope } from '../auth/matrix.js'
import type { Role } from '../auth/types.js'

export const MIN_BODY_LENGTH = 1
export const MAX_BODY_LENGTH = 2000

const AUTHOR_SELECT = { id: true, displayName: true, role: true } as const

const ENTRY_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: AUTHOR_SELECT },
} as const

function ticketNotFound(): ApiError {
  return new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Author and creation time are server-set; naming either is a failure rather
 * than a field to ignore, so a client cannot believe it set them (BR-30).
 */
export function validateEntryBody(payload: unknown): {
  body: string
  errors: FieldError[]
} {
  if (!isRecord(payload)) {
    return { body: '', errors: [{ field: 'body', message: 'Send a JSON object.' }] }
  }

  const errors: FieldError[] = Object.keys(payload)
    .filter((key) => key !== 'body')
    .map((key) => ({ field: key, message: 'This field is not accepted.' }))

  const raw = payload.body
  if (typeof raw !== 'string') {
    errors.push({ field: 'body', message: 'Write something before posting.' })
    return { body: '', errors }
  }

  // Trimmed first: whitespace-only content is empty content (BR-31).
  const body = raw.trim()
  if (body.length < MIN_BODY_LENGTH) {
    errors.push({ field: 'body', message: 'Write something before posting.' })
  } else if (body.length > MAX_BODY_LENGTH) {
    errors.push({
      field: 'body',
      message: `Keep this to ${MAX_BODY_LENGTH} characters or fewer.`,
    })
  }

  return { body, errors }
}

/**
 * The Ticket this caller may act on, or a 404. An `own` grant filters by the
 * authenticated id inside the query (SEC-019), and a refusal is answered the
 * same way as an absence (BR-14).
 */
async function requireTicket(
  ticketId: string,
  userId: string,
  grant: Scope,
  db: PrismaClient,
): Promise<void> {
  const ticket = await db.ticket.findFirst({
    where: grant === 'own' ? { id: ticketId, requesterId: userId } : { id: ticketId },
    select: { id: true },
  })
  if (!ticket) throw ticketNotFound()
}

export async function listPublicComments(
  ticketId: string,
  userId: string,
  grant: Scope,
  db: PrismaClient,
) {
  await requireTicket(ticketId, userId, grant, db)
  return db.publicComment.findMany({
    where: { ticketId },
    select: ENTRY_SELECT,
    orderBy: { createdAt: 'asc' },
  })
}

export async function createPublicComment(
  ticketId: string,
  userId: string,
  grant: Scope,
  payload: unknown,
  db: PrismaClient,
) {
  await requireTicket(ticketId, userId, grant, db)

  const { body, errors } = validateEntryBody(payload)
  if (errors.length > 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'The comment was not accepted.', errors)
  }

  return db.publicComment.create({
    data: { ticketId, authorId: userId, body },
    select: ENTRY_SELECT,
  })
}

/**
 * Internal Notes are IT Staff and Administrator only. The role gate refuses a
 * Requester before this runs; `grant` is always `any` here, and the parameter
 * stays so the two thread functions read the same at their call sites.
 */
export async function listInternalNotes(
  ticketId: string,
  userId: string,
  grant: Scope,
  db: PrismaClient,
) {
  await requireTicket(ticketId, userId, grant, db)
  return db.internalNote.findMany({
    where: { ticketId },
    select: ENTRY_SELECT,
    orderBy: { createdAt: 'asc' },
  })
}

export async function createInternalNote(
  ticketId: string,
  userId: string,
  grant: Scope,
  payload: unknown,
  db: PrismaClient,
) {
  await requireTicket(ticketId, userId, grant, db)

  const { body, errors } = validateEntryBody(payload)
  if (errors.length > 0) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'The note was not accepted.', errors)
  }

  return db.internalNote.create({
    data: { ticketId, authorId: userId, body },
    select: ENTRY_SELECT,
  })
}

/**
 * Logged separately from an ordinary forbidden: a Requester reaching for
 * Internal Notes is the access this system most needs to notice (SEC-026).
 */
export function logInternalNoteRefusal(role: Role, ticketId: string): void {
  logSecurityEvent('INTERNAL_NOTE_REFUSED', { role, ticketId })
}
