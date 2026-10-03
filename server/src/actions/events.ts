// Ticket history writes (lab-04 BR-26, BR-27, BR-30). An event is written inside the transaction of the
// change it records, and its payload holds identifiers, statuses and field names only: never free text.
import { Prisma } from '../generated/prisma/client.js'

export type Tx = Prisma.TransactionClient

export type ActionEventType =
  | 'ACTION_CREATED'
  | 'ACTION_UPDATED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_STARTED'
  | 'ACTION_COMPLETED'
  | 'ACTION_CANCELLED'

export async function appendActionEvent(
  tx: Tx,
  event: {
    ticketId: string
    actionId: string
    actorId: string
    type: ActionEventType
    payload: Prisma.InputJsonObject
  },
): Promise<void> {
  await tx.ticketEvent.create({
    data: {
      ticketId: event.ticketId,
      actionId: event.actionId,
      actorId: event.actorId,
      type: event.type,
      payload: event.payload,
    },
  })
}

// STUB: the payload builders return nothing until they are written (lab-04 BR-30).
export const statusChangedPayload = (_input: { from: string; to: string; cascadedActionCount?: number }): Prisma.InputJsonObject => ({})
export const ownerChangedPayload = (_input: { fromOwnerId: string | null; toOwnerId: string | null }): Prisma.InputJsonObject => ({})
export const priorityChangedPayload = (_input: { from: string; to: string }): Prisma.InputJsonObject => ({})
export const actionCreatedPayload = (_input: { assigneeId: string }): Prisma.InputJsonObject => ({})
export const actionUpdatedPayload = (_changedFields: readonly string[]): Prisma.InputJsonObject => ({})
export const actionAssignedPayload = (_input: { fromAssigneeId: string; toAssigneeId: string }): Prisma.InputJsonObject => ({})
export const actionMovedPayload = (_input: { from: string; to: string; cascade?: boolean }): Prisma.InputJsonObject => ({})
