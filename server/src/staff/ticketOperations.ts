// Ownership, IT Priority, and status (api-spec.md §8).
//
// Every rule here is enforced server-side whatever the client sends. The
// screen's control offers only permitted transitions; that is feedback, and
// this is the control (SEC-016).
import { type PrismaClient } from '../generated/prisma/client.js'
import {
  appendEvents,
  ownerChangedPayload,
  priorityChangedPayload,
  statusChangedPayload,
  actionMovedPayload,
  type NewEvent,
  type Tx,
} from '../actions/events.js'
import { ApiError, type FieldError } from '../http/errors.js'
import { logSecurityEvent } from '../http/securityLog.js'
import { PRIORITIES } from '../tickets/validation.js'
import {
  TICKET_STATUSES,
  allowedTransitions,
  mayTransition,
  type TicketStatus,
} from '../tickets/transitions.js'
import { OPEN_ACTION_STATUSES, byCreation, workflowFor } from '../tickets/workflowRules.js'
import type { Role } from '../auth/types.js'
import type { Scope } from '../auth/matrix.js'

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

const ASSIGNABLE_OWNER_SELECT = {
  id: true,
  displayName: true,
} as const

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

/**
 * `scope` narrows the lookup to a Requester's own Ticket when the caller's
 * grant is `own` (SEC-019) — an `any` caller needs no filter. Passing no
 * scope at all is only safe when the route's own authorization already
 * excludes Requester (as `getStaffTicketDetail` does by also requiring
 * `note:read`), since this function has no other way to tell.
 */
async function loadTicket(
  ticketId: string,
  db: PrismaClient,
  scope?: { requesterId: string },
) {
  const ticket = await db.ticket.findFirst({
    where: scope ? { id: ticketId, requesterId: scope.requesterId } : { id: ticketId },
    include: STAFF_DETAIL_INCLUDE,
  })
  if (!ticket) throw ticketNotFound()
  return ticket
}

type StaffTicket = Awaited<ReturnType<typeof loadTicket>>

async function assignableOwners(db: PrismaClient) {
  return db.user.findMany({
    where: { isActive: true, role: { in: OWNER_ROLES } },
    select: ASSIGNABLE_OWNER_SELECT,
    orderBy: { displayName: 'asc' },
  })
}

function countOpenActions(db: PrismaClient | Tx, ticketId: string): Promise<number> {
  return db.actionTaken.count({ where: { ticketId, status: { in: [...OPEN_ACTION_STATUSES] } } })
}

async function mapStaffTicket(ticket: StaffTicket, role: Role, db: PrismaClient) {
  const openActionCount = await countOpenActions(db, ticket.id)
  const workflow = workflowFor(role, ticket.status as TicketStatus, openActionCount)
  return {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    version: ticket.version,
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
    assignableOwners: await assignableOwners(db),
    openActionCount,
    // Policy the client is told, not policy it computes.
    permittedTransitions: workflow.permitted,
    blockedTransitions: workflow.blocked,
  }
}

export async function getStaffTicketDetail(
  ticketId: string,
  role: Role,
  db: PrismaClient,
) {
  return mapStaffTicket(await loadTicket(ticketId, db), role, db)
}

/** The Ticket row, locked for the rest of the transaction (BR-33). Another Requester's Ticket is not found. */
async function lockTicket(tx: Tx, ticketId: string, scope?: { requesterId: string }) {
  const rows = await tx.$queryRaw<
    { status: string; version: number; requesterId: string; ownerId: string | null; itPriority: string; updatedAt: Date }[]
  >`
    SELECT "status"::text AS "status", "version", "requesterId", "ownerId", "itPriority"::text AS "itPriority", "updatedAt"
    FROM "Ticket" WHERE "id" = ${ticketId}::uuid FOR UPDATE`
  if (rows.length === 0 || (scope && rows[0].requesterId !== scope.requesterId)) throw ticketNotFound()
  return rows[0]
}

/** A request that waited for the lock may carry an instant earlier than the change before it; updatedAt never goes back. */
const stampFor = (now: Date, ticket: { updatedAt: Date }): Date => (ticket.updatedAt > now ? ticket.updatedAt : now)

export async function setTicketOwner(
  ticketId: string,
  callerId: string,
  role: Role,
  body: unknown,
  now: Date,
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

  await db.$transaction(async (tx) => {
    const ticket = await lockTicket(tx, ticketId)
    const targetId = raw === 'me' ? callerId : raw

    if (typeof targetId === 'string') {
      const target = await tx.user.findUnique({
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
    const ownerChanged = targetId !== ticket.ownerId
    // Asking for what is already stored changes nothing: no version, no event (BR-31, BR-26).
    if (!ownerChanged && !claimsNewTicket) return

    await tx.ticket.update({
      where: { id: ticketId },
      data: {
        ownerId: targetId,
        ...(claimsNewTicket ? { status: 'OPEN' } : {}),
        version: { increment: 1 },
        updatedAt: stampFor(now, ticket),
      },
      select: { id: true },
    })
    const events: NewEvent[] = []
    if (ownerChanged) {
      events.push({
        ticketId,
        actorId: callerId,
        type: 'OWNER_CHANGED',
        payload: ownerChangedPayload({ fromOwnerId: ticket.ownerId, toOwnerId: targetId }),
      })
    }
    if (claimsNewTicket) {
      events.push({
        ticketId,
        actorId: callerId,
        type: 'STATUS_CHANGED',
        payload: statusChangedPayload({ from: 'NEW', to: 'OPEN' }),
      })
    }
    await appendEvents(tx, now, events)
  })

  return mapStaffTicket(await loadTicket(ticketId, db), role, db)
}

export async function setItPriority(
  ticketId: string,
  callerId: string,
  role: Role,
  body: unknown,
  now: Date,
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

  await db.$transaction(async (tx) => {
    const ticket = await lockTicket(tx, ticketId)
    if (ticket.itPriority === raw) return

    await tx.ticket.update({
      where: { id: ticketId },
      data: { itPriority: raw as Priority, version: { increment: 1 }, updatedAt: stampFor(now, ticket) },
      select: { id: true },
    })
    await appendEvents(tx, now, [
      {
        ticketId,
        actorId: callerId,
        type: 'IT_PRIORITY_CHANGED',
        payload: priorityChangedPayload({ from: ticket.itPriority, to: raw }),
      },
    ])
  })

  return mapStaffTicket(await loadTicket(ticketId, db), role, db)
}

const ALL_ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

/** The version the caller last saw: a whole number from 1 (BR-31). */
function readExpectedVersion(raw: unknown): FieldError[] {
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 1
    ? []
    : [{ field: 'expectedVersion', message: 'Send the version you last saw, a whole number from 1.' }]
}

export async function setTicketStatus(
  ticketId: string,
  callerId: string,
  role: Role,
  grant: Scope,
  body: unknown,
  now: Date,
  db: PrismaClient,
) {
  const errors = rejectUnknownFields(body, ['status', 'expectedVersion'])
  if (errors.length > 0) throw validationFailed(errors)

  const { status: raw, expectedVersion } = body as Record<string, unknown>
  if (typeof raw !== 'string' || !TICKET_STATUSES.includes(raw as TicketStatus)) {
    errors.push({ field: 'status', message: 'Choose a valid ticket status.' })
  }
  errors.push(...readExpectedVersion(expectedVersion))
  if (errors.length > 0) throw validationFailed(errors)
  const to = raw as TicketStatus

  const result = await db.$transaction(async (tx) => {
    // A Requester's grant is `own` (§5.1 lets them cancel or reopen their own
    // Ticket) — without the scope any Ticket id would resolve, letting a
    // Requester drive another Requester's Ticket through this endpoint.
    const ticket = await lockTicket(tx, ticketId, grant === 'own' ? { requesterId: callerId } : undefined)
    const from = ticket.status as TicketStatus

    if (ticket.version !== expectedVersion) {
      throw new ApiError(
        409,
        'STALE_VERSION',
        'This Ticket was changed by someone else. Review the latest version and try again.',
        [],
        { currentVersion: ticket.version, currentStatus: ticket.status },
      )
    }

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

    // BR-20: the server holds the gate, whatever the client offered. It is checked for CLOSED too, so
    // data written outside the application cannot slip through.
    const open = await tx.actionTaken.findMany({
      where: { ticketId, status: { in: [...OPEN_ACTION_STATUSES] } },
      select: { id: true, status: true, createdAt: true },
    })
    if ((to === 'RESOLVED' || to === 'CLOSED') && open.length > 0) {
      throw new ApiError(
        409,
        'OPEN_ACTIONS_BLOCK_RESOLUTION',
        'This Ticket still has open Actions. Complete or cancel them first.',
        [],
        { openActionCount: open.length },
      )
    }

    // BR-22: cancelling the Ticket cancels its open work in the same transaction.
    const cascaded = to === 'CANCELLED' ? [...open].sort(byCreation) : []
    if (cascaded.length > 0) {
      await tx.actionTaken.updateMany({
        where: { id: { in: cascaded.map((action) => action.id) } },
        data: {
          status: 'CANCELLED',
          cancelledById: callerId,
          cancelledAt: now,
          cancellationReason: 'Ticket cancelled',
          version: { increment: 1 },
          updatedAt: now,
        },
      })
    }

    const updated = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: to,
        version: { increment: 1 },
        updatedAt: stampFor(now, ticket),
        // BR-23: the Requester's signal is about the problem they reported, and
        // reopening says it was not solved after all.
        ...(to === 'REOPENED' ? { requesterResolvedAt: null } : {}),
      },
      select: { version: true, updatedAt: true },
    })

    await appendEvents(tx, now, [
      {
        ticketId,
        actorId: callerId,
        type: 'STATUS_CHANGED',
        payload: statusChangedPayload({ from, to, cascadedActionCount: cascaded.length }),
      },
      ...cascaded.map((action) => ({
        ticketId,
        actionId: action.id,
        actorId: callerId,
        type: 'ACTION_CANCELLED' as const,
        payload: actionMovedPayload({ from: action.status, to: 'CANCELLED', cascade: true }),
      })),
    ])

    return { updated, openAfter: to === 'CANCELLED' ? 0 : open.length, cancelledActionCount: cascaded.length }
  })

  return {
    id: ticketId,
    status: to,
    version: result.updated.version,
    updatedAt: result.updated.updatedAt,
    permittedTransitions: workflowFor(role, to, result.openAfter).permitted,
    cancelledActionCount: result.cancelledActionCount,
  }
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
    // The indication is a Ticket field, so it moves the version on (BR-31).
    data: { requesterResolvedAt: now, version: { increment: 1 } },
    select: { requesterResolvedAt: true, status: true },
  })

  // The status is echoed deliberately, so a client that expected a transition
  // can see there wasn't one (api-spec.md §6).
  return { requesterResolvedAt: updated.requesterResolvedAt, status: updated.status }
}
