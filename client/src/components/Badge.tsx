// Every badge carries its text; colour is supporting only (AC-36, STY-019).
// Priority uses its own tokens, never the semantic ones (STY-030).
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

const PRIORITY_CLASS: Record<Priority, string> = {
  LOW: 'zen-badge--priority-low',
  MEDIUM: 'zen-badge--priority-medium',
  HIGH: 'zen-badge--priority-high',
  URGENT: 'zen-badge--priority-urgent',
}

export function PriorityBadge({ value }: { value: Priority }) {
  return <span className={`zen-badge ${PRIORITY_CLASS[value]}`}>{value}</span>
}

export function StatusBadge({ value }: { value: TicketStatus }) {
  return <span className="zen-badge zen-badge--status">{value}</span>
}
