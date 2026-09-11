// The status transition matrix from specification.md §5.1, as data.
// Stub: tests/lab-03/transitions.unit.test.ts drives out the table.
import type { Role } from '../auth/types.js'

export type TicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED'

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
]

/** Every status this role may move `from` to. A transition absent is refused (BR-21). */
export function allowedTransitions(
  _role: Role,
  _from: TicketStatus,
): readonly TicketStatus[] {
  return []
}

export function mayTransition(
  _role: Role,
  _from: TicketStatus,
  _to: TicketStatus,
): boolean {
  return false
}
