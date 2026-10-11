// Ticket history writes (lab-04 BR-26, BR-27, BR-30). An event is written inside the transaction of the
// change it records, and its payload holds identifiers, statuses and field names only: never free text.
import { Prisma } from '../generated/prisma/client.js'
import { TICKET_STATUSES } from '../tickets/transitions.js'
import { PRIORITIES } from '../tickets/validation.js'
import { ACTION_STATUSES } from './rules.js'

export type Tx = Prisma.TransactionClient

export type EventType =
  | 'STATUS_CHANGED'
  | 'OWNER_CHANGED'
  | 'IT_PRIORITY_CHANGED'
  | 'ACTION_CREATED'
  | 'ACTION_UPDATED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_STARTED'
  | 'ACTION_COMPLETED'
  | 'ACTION_CANCELLED'

export type NewEvent = {
  ticketId: string
  actionId?: string
  actorId: string
  type: EventType
  payload: Prisma.InputJsonObject
}

/** Writes one change's events 1 ms apart from `at`, or from 1 ms after the Ticket's latest event if that is later (BR-29, AC-22). */
export async function appendEvents(tx: Tx, at: Date, events: readonly NewEvent[]): Promise<void> {
  if (events.length === 0) return
  const { ticketId } = events[0]
  if (events.some((event) => event.ticketId !== ticketId)) throw new Error('Events of one change belong to one Ticket.')

  // The caller holds the Ticket row lock, so createdAt stays strictly increasing in commit order, even past a long cascade.
  const [latest] = await tx.$queryRaw<{ at: Date | null }[]>`
    SELECT MAX("createdAt") AS "at" FROM "TicketEvent" WHERE "ticketId" = ${ticketId}::uuid`
  const start = latest?.at ? Math.max(at.getTime(), latest.at.getTime() + 1) : at.getTime()

  for (const [index, event] of events.entries()) {
    await tx.ticketEvent.create({
      data: {
        ticketId,
        actionId: event.actionId ?? null,
        actorId: event.actorId,
        type: event.type,
        payload: event.payload,
        createdAt: new Date(start + index),
      },
    })
  }
}

// Payload builders. Each one names its properties, so nothing a caller passes in besides them can reach the
// history, and each value is checked to be an identifier, a status, a priority or a field name (BR-30).
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ACTION_FIELD_NAMES: readonly string[] = ['description', 'result', 'followUpRequired', 'followUpNote', 'attachmentNotes']

function oneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!(allowed as readonly string[]).includes(value)) throw new Error(`Event payload: ${label} is not one of the allowed values.`)
  return value as T
}

function identifier(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) throw new Error(`Event payload: ${label} is not an identifier.`)
  return value
}

const optionalIdentifier = (value: string | null, label: string): string | null => (value === null ? null : identifier(value, label))

export function statusChangedPayload(input: { from: string; to: string; cascadedActionCount?: number }): Prisma.InputJsonObject {
  const from = oneOf(input.from, TICKET_STATUSES, 'from')
  const to = oneOf(input.to, TICKET_STATUSES, 'to')
  if (to !== 'CANCELLED') return { from, to }
  const count = input.cascadedActionCount ?? 0
  if (!Number.isInteger(count) || count < 0) throw new Error('Event payload: cascadedActionCount is not a count.')
  return { from, to, cascadedActionCount: count }
}

export const ownerChangedPayload = (input: { fromOwnerId: string | null; toOwnerId: string | null }): Prisma.InputJsonObject => ({
  fromOwnerId: optionalIdentifier(input.fromOwnerId, 'fromOwnerId'),
  toOwnerId: optionalIdentifier(input.toOwnerId, 'toOwnerId'),
})

export const priorityChangedPayload = (input: { from: string; to: string }): Prisma.InputJsonObject => ({
  from: oneOf(input.from, PRIORITIES, 'from'),
  to: oneOf(input.to, PRIORITIES, 'to'),
})

export const actionCreatedPayload = (input: { assigneeId: string }): Prisma.InputJsonObject => ({
  assigneeId: identifier(input.assigneeId, 'assigneeId'),
})

export function actionUpdatedPayload(changedFields: readonly string[]): Prisma.InputJsonObject {
  if (changedFields.length === 0) throw new Error('Event payload: no field changed.')
  return { changedFields: changedFields.map((field) => oneOf(field, ACTION_FIELD_NAMES, 'changedFields')) }
}

export const actionAssignedPayload = (input: { fromAssigneeId: string; toAssigneeId: string }): Prisma.InputJsonObject => ({
  fromAssigneeId: identifier(input.fromAssigneeId, 'fromAssigneeId'),
  toAssigneeId: identifier(input.toAssigneeId, 'toAssigneeId'),
})

/** A start, completion or cancellation. A cancellation says whether the Ticket's cancellation caused it (BR-22). */
export function actionMovedPayload(input: { from: string; to: string; cascade?: boolean }): Prisma.InputJsonObject {
  const from = oneOf(input.from, ACTION_STATUSES, 'from')
  const to = oneOf(input.to, ACTION_STATUSES, 'to')
  return to === 'CANCELLED' ? { from, to, cascade: input.cascade === true } : { from, to }
}
