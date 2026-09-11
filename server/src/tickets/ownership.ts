// Object-level authorization. Stub: tests/lab-03/ownership.api.test.ts drives it out.
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
  _ticketId: string,
  _userId: string,
  _grant: Scope,
): Promise<CallerTicket | null> {
  return null
}
