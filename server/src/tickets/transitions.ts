// The status transition matrix from specification.md §5.1, as data.
// A transition absent from this table is refused, whatever the client sends
// (BR-21). Rows are the current status; the value is where that actor may go.
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

export const TICKET_STATUSES: readonly TicketStatus[] = Object.freeze([
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
])

type Row = {
  requester: readonly TicketStatus[]
  staff: readonly TicketStatus[]
}

// The Administrator column is the IT Staff column (§11.8), so the table has
// two branches rather than three: one role cannot drift from the other.
const TRANSITIONS: Record<TicketStatus, Row> = {
  NEW: {
    // Raised in error and not yet worked — refusing costs IT Staff a chore
    // and the Requester their agency (§11.6).
    requester: ['CANCELLED'],
    staff: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  },
  OPEN: {
    requester: [],
    staff: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  },
  IN_PROGRESS: {
    requester: [],
    staff: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  },
  WAITING_FOR_REQUESTER: {
    requester: [],
    staff: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  },
  RESOLVED: {
    // The counterpart to BR-22: a Requester cannot declare a problem solved,
    // but is the only person who genuinely knows it is not (§11.6).
    requester: ['REOPENED'],
    staff: ['CLOSED', 'REOPENED'],
  },
  CLOSED: {
    requester: [],
    staff: ['REOPENED'],
  },
  REOPENED: {
    requester: [],
    staff: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  },
  CANCELLED: {
    requester: [],
    staff: [],
  },
}

/** Every status this role may move `from` to. Empty means no move at all. */
export function allowedTransitions(
  role: Role,
  from: TicketStatus,
): readonly TicketStatus[] {
  if (!Object.hasOwn(TRANSITIONS, from)) return []
  const row = TRANSITIONS[from]
  return role === 'REQUESTER' ? row.requester : row.staff
}

export function mayTransition(
  role: Role,
  from: TicketStatus,
  to: TicketStatus,
): boolean {
  return allowedTransitions(role, from).includes(to)
}
