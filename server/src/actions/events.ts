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
