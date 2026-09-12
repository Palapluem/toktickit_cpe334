// Ownership, IT Priority, and status (api-spec.md §8).
//
// Every rule here is enforced server-side whatever the client sends. The
// screen's control offers only permitted transitions; that is feedback, and
// this is the control (SEC-016).
import { type PrismaClient } from '../generated/prisma/client.js'
import { ApiError, type FieldError } from '../http/errors.js'
import { logSecurityEvent } from '../http/securityLog.js'
import { PRIORITIES } from '../tickets/validation.js'
import {
  TICKET_STATUSES,
  allowedTransitions,
  mayTransition,
  type TicketStatus,
} from '../tickets/transitions.js'
import type { Role } from '../auth/types.js'

type Priority = (typeof PRIORITIES)[number]

const ACTOR_SELECT = { id: true, displayName: true } as const

const STAFF_DETAIL_INCLUDE = {
  requester: { select: ACTOR_SELECT },
  owner: { select: ACTOR_SELECT },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  attachments: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      uploadedBy: { select: ACTOR_SELECT },
      removedBy: { select: ACTOR_SELECT },
    },
  },
} as const

/** Roles that may hold a Ticket, per BR-16. */
const OWNER_ROLES: Role[] = ['IT_STAFF', 'ADMINISTRATOR']

function ticketNotFound(): ApiError {
  return new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.')
}

function validationFailed(fieldErrors: FieldError[]): ApiError {
  return new ApiError(
    400,
    'VALIDATION_FAILED',
    'The request was not accepted.',
    fieldErrors,
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Only the keys named; anything else is a validation failure, never ignored. */
function rejectUnknownFields(body: unknown, allowed: string[]): FieldError[] {
  if (!isRecord(body)) {
    return [{ field: 'body', message: 'Send a JSON object.' }]
  }
  return Object.keys(body)
    .filter((key) => !allowed.includes(key))
    .map((key) => ({ field: key, message: 'This field is not accepted.' }))
}

async function loadTicket(ticketId: string, db: PrismaClient) {
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: STAFF_DETAIL_INCLUDE,
  })
  if (!ticket) throw ticketNotFound()
  return ticket
}

type StaffTicket = Awaited<ReturnType<typeof loadTicket>>

function mapStaffTicket(ticket: StaffTicket, role: Role) {
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
    requesterResolvedAt: ticket.requesterResolvedAt,
    requester: ticket.requester,
    owner: ticket.owner,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    attachments: ticket.attachments.map((attachment) => ({
      id: attachment.id,
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
      removedAt: attachment.removedAt,
      removedReason: attachment.removedReason,
    })),
    // Policy the client is told, not policy it computes.
    permittedTransitions: allowedTransitions(role, ticket.status as TicketStatus),
  }
}

export async function getStaffTicketDetail(
  ticketId: string,
  role: Role,
  db: PrismaClient,
) {
  return mapStaffTicket(await loadTicket(ticketId, db), role)
}

export async function setTicketOwner(
  ticketId: string,
  callerId: string,
  role: Role,
  body: unknown,
  db: PrismaClient,
) {
  const unknown = rejectUnknownFields(body, ['ownerId'])
  if (unknown.length > 0) throw validationFailed(unknown)

  const raw = (body as Record<string, unknown>).ownerId
  if (raw !== null && typeof raw !== 'string') {
    throw validationFailed([
      { field: 'ownerId', message: 'Send a user id, "me", or null.' },
    ])
  }

  const ticket = await loadTicket(ticketId, db)
  const targetId = raw === 'me' ? callerId : raw

  if (typeof targetId === 'string') {
    const target = await db.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, isActive: true },
    })
    // BR-16: an owner must be an *active* IT Staff or Administrator. An
    // inactive one is refused for the same reason a deactivated session is.
    if (!target || !target.isActive || !OWNER_ROLES.includes(target.role)) {
      throw new ApiError(
        400,
        'OWNER_NOT_ELIGIBLE',
        'A Ticket Owner must be an active IT Staff or Administrator user.',
        [{ field: 'ownerId', message: 'Choose an active IT Staff or Administrator.' }],
      )
    }
  }

  // BR-24: a claimed Ticket that is still NEW misrepresents the queue, so the
  // move to OPEN happens in the same write rather than as a second step.
  const claimsNewTicket = targetId !== null && ticket.status === 'NEW'
  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: {
      ownerId: targetId,
      ...(claimsNewTicket ? { status: 'OPEN' } : {}),
    },
    include: STAFF_DETAIL_INCLUDE,
  })

  return mapStaffTicket(updated, role)
}

export async function setItPriority(
  ticketId: string,
  role: Role,
  body: unknown,
  db: PrismaClient,
) {
  // Requested Priority is set once by the Requester and never altered
  // afterwards, by anyone (BR-18) — so naming it here is a failure, not a
  // field to quietly drop.
  const unknown = rejectUnknownFields(body, ['itPriority'])
  if (unknown.length > 0) throw validationFailed(unknown)

  const raw = (body as Record<string, unknown>).itPriority
  if (typeof raw !== 'string' || !PRIORITIES.includes(raw as Priority)) {
    throw validationFailed([
      { field: 'itPriority', message: 'Choose LOW, MEDIUM, HIGH, or URGENT.' },
    ])
  }

  await loadTicket(ticketId, db)
  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: { itPriority: raw as Priority },
    include: STAFF_DETAIL_INCLUDE,
  })

  return mapStaffTicket(updated, role)
}

const ALL_ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

export async function setTicketStatus(
  ticketId: string,
  role: Role,
  body: unknown,
  db: PrismaClient,
) {
  const unknown = rejectUnknownFields(body, ['status'])
  if (unknown.length > 0) throw validationFailed(unknown)

  const raw = (body as Record<string, unknown>).status
  if (typeof raw !== 'string' || !TICKET_STATUSES.includes(raw as TicketStatus)) {
    throw validationFailed([
      { field: 'status', message: 'Choose a valid ticket status.' },
    ])
  }

  const ticket = await loadTicket(ticketId, db)
  const from = ticket.status as TicketStatus
  const to = raw as TicketStatus

  if (!mayTransition(role, from, to)) {
    // Both are refusals; the distinction is *why*. Someone asking for a move
    // no role may make has asked for something impossible (400). Someone
    // asking for a move their role alone may not make has asked for something
    // forbidden (403) — a Requester sending RESOLVED lands here (BR-22).
    const someoneMay = ALL_ROLES.some((other) => mayTransition(other, from, to))
    if (someoneMay) {
      logSecurityEvent('STATUS_TRANSITION_FORBIDDEN', { role, from, to })
      throw new ApiError(
        403,
        'FORBIDDEN',
        'Your role may not make this status change.',
      )
    }
    throw new ApiError(
      400,
      'INVALID_STATUS_TRANSITION',
      `A Ticket in ${from} cannot move to ${to}.`,
      [
        {
          field: 'status',
          // Policy, not data — safe to disclose (api-spec.md §8).
          message: `Permitted from ${from}: ${allowedTransitions(role, from).join(', ') || 'none'}.`,
        },
      ],
    )
  }

  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: {
      status: to,
      // BR-23: the Requester's signal is about the problem they reported, and
      // reopening says it was not solved after all.
      ...(to === 'REOPENED' ? { requesterResolvedAt: null } : {}),
    },
    include: STAFF_DETAIL_INCLUDE,
  })

  return mapStaffTicket(updated, role)
}

/**
 * The Requester's "appears resolved" signal. A timestamp, never a status:
 * BR-22 forbids a Requester setting RESOLVED, and modelling this as a status
 * would either violate that or invent a parallel one (§11.7).
 */
export async function indicateRequesterResolution(
  ticketId: string,
  requesterId: string,
  now: Date,
  db: PrismaClient,
) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, requesterId },
    select: { id: true, status: true },
  })
  if (!ticket) throw ticketNotFound()

  if (ticket.status === 'CANCELLED' || ticket.status === 'CLOSED') {
    throw new ApiError(
      409,
      'TICKET_CLOSED',
      'This Ticket is closed, so it cannot be marked as appearing resolved.',
    )
  }

  const updated = await db.ticket.update({
    where: { id: ticketId },
    data: { requesterResolvedAt: now },
    select: { requesterResolvedAt: true, status: true },
  })

  // The status is echoed deliberately, so a client that expected a transition
  // can see there wasn't one (api-spec.md §6).
  return { requesterResolvedAt: updated.requesterResolvedAt, status: updated.status }
}
