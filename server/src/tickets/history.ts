// The Ticket history (lab-04 api-spec §4, BR-26 to BR-30). Events are stored with identifiers; names are
// resolved here, at read time, so a renamed user shows under the current name and no name sits in the log.
import type { PrismaClient } from '../generated/prisma/client.js'
import { ApiError } from '../http/errors.js'
import type { Scope } from '../auth/matrix.js'
import { CREATION_ORDER } from './workflowRules.js'

type Payload = Record<string, unknown>

const asPayload = (value: unknown): Payload =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Payload) : {}

const identifiersIn = (payload: Payload): string[] =>
  ['fromOwnerId', 'toOwnerId', 'assigneeId', 'fromAssigneeId', 'toAssigneeId']
    .map((key) => payload[key])
    .filter((value): value is string => typeof value === 'string')

/** What the interface shows for one event: statuses, priorities, field names and display names (BR-30). */
function detailsOf(
  type: string,
  actionId: string | null,
  payload: Payload,
  nameOf: (userId: unknown) => string | null,
): Record<string, unknown> {
  switch (type) {
    case 'STATUS_CHANGED':
      return {
        from: payload.from,
        to: payload.to,
        ...(payload.cascadedActionCount === undefined ? {} : { cascadedActionCount: payload.cascadedActionCount }),
      }
    case 'OWNER_CHANGED':
      return { fromOwner: nameOf(payload.fromOwnerId), toOwner: nameOf(payload.toOwnerId) }
    case 'IT_PRIORITY_CHANGED':
      return { from: payload.from, to: payload.to }
    case 'ACTION_CREATED':
      return { actionId, assignee: nameOf(payload.assigneeId) }
    case 'ACTION_UPDATED':
      return { actionId, changedFields: payload.changedFields }
    case 'ACTION_ASSIGNED':
      return { actionId, fromAssignee: nameOf(payload.fromAssigneeId), toAssignee: nameOf(payload.toAssigneeId) }
    case 'ACTION_CANCELLED':
      return { actionId, cascade: payload.cascade === true }
    default:
      return { actionId }
  }
}

/**
 * Oldest first, ties broken by identifier (BR-29). The `own` grant is a Requester's, who sees status changes
 * of their own Ticket only (BR-28); everyone else sees every event.
 */
export async function listHistory(ticketId: string, callerId: string, grant: Scope, db: PrismaClient) {
  const ticket = await db.ticket.findFirst({
    where: grant === 'own' ? { id: ticketId, requesterId: callerId } : { id: ticketId },
    select: { id: true },
  })
  if (!ticket) throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.')

  const events = await db.ticketEvent.findMany({
    where: { ticketId, ...(grant === 'own' ? { type: 'STATUS_CHANGED' as const } : {}) },
    orderBy: [...CREATION_ORDER],
    include: { actor: { select: { displayName: true } } },
  })

  const userIds = [...new Set(events.flatMap((event) => identifiersIn(asPayload(event.payload))))]
  const users =
    userIds.length === 0
      ? []
      : await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
  const names = new Map(users.map((user) => [user.id, user.displayName]))
  const nameOf = (userId: unknown): string | null => (typeof userId === 'string' ? (names.get(userId) ?? null) : null)

  return events.map((event) => ({
    id: event.id,
    type: event.type,
    actor: { displayName: event.actor.displayName },
    createdAt: event.createdAt,
    details: detailsOf(event.type, event.actionId, asPayload(event.payload), nameOf),
  }))
}
