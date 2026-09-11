// Object-level authorization: the half of SEC-017 that role alone cannot decide.
import prisma from '../prisma.js'
import { UUID } from './validation.js'
import type { Scope } from '../auth/matrix.js'

export type CallerTicket = {
  id: string
  requesterId: string
  ownerId: string | null
  status: string
}

/**
 * The Ticket this caller may act on, or null. An `own` grant filters by the
 * authenticated id inside the query (SEC-019); the caller never supplies it.
 * Null means "not found" to the caller either way, so a refusal does not
 * confirm the record exists (BR-14, SEC-024).
 */
export async function findTicketForCaller(
  ticketId: string,
  userId: string,
  grant: Scope,
): Promise<CallerTicket | null> {
  if (!UUID.test(ticketId)) return null

  return prisma.ticket.findFirst({
    where: grant === 'own' ? { id: ticketId, requesterId: userId } : { id: ticketId },
    select: { id: true, requesterId: true, ownerId: true, status: true },
  })
}
