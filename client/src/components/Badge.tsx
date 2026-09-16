// Every badge carries its text; colour is supporting only (AC-36, STY-019).
// Priority uses its own tokens, never the semantic ones (STY-030).
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type TicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED'

export type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'

const PRIORITY_CLASS: Record<Priority, string> = {
  LOW: 'zen-badge--priority-low',
  MEDIUM: 'zen-badge--priority-medium',
  HIGH: 'zen-badge--priority-high',
  URGENT: 'zen-badge--priority-urgent',
}

export function PriorityBadge({ value }: { value: Priority }) {
  return <span className={`zen-badge ${PRIORITY_CLASS[value]}`}>{value}</span>
}

// Lab 2 rendered one status; all eight are reachable now (lab-03 ui-spec §3).
// IN_PROGRESS and WAITING_FOR_REQUESTER share a palette on purpose: both are
// live work, and their labels carry the difference.
const STATUS_CLASS: Record<TicketStatus, string> = {
  NEW: 'zen-badge--status-new',
  OPEN: 'zen-badge--status-open',
  IN_PROGRESS: 'zen-badge--status-active',
  WAITING_FOR_REQUESTER: 'zen-badge--status-active',
  RESOLVED: 'zen-badge--status-resolved',
  CLOSED: 'zen-badge--status-quiet',
  REOPENED: 'zen-badge--status-reopened',
  CANCELLED: 'zen-badge--status-quiet',
}

export function StatusBadge({ value }: { value: TicketStatus }) {
  return (
    <span className={`zen-badge zen-badge--status ${STATUS_CLASS[value]}`}>
      {value}
    </span>
  )
}

const ROLE_CLASS: Record<Role, string> = {
  REQUESTER: 'zen-badge--role-requester',
  IT_STAFF: 'zen-badge--role-staff',
  ADMINISTRATOR: 'zen-badge--role-administrator',
}

/** The three darken in order of privilege — a supporting cue, never the only one. */
export function RoleBadge({ value }: { value: Role }) {
  return (
    <span className={`zen-badge ${ROLE_CLASS[value]}`}>{value.replace('_', ' ')}</span>
  )
}
