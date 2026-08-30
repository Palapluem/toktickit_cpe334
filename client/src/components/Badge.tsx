// STUB — seam only (testing-contract.md §5). Implemented in the feat: commit.
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

export function PriorityBadge(_props: { value: Priority }) {
  return null
}

export function StatusBadge(_props: { value: TicketStatus }) {
  return null
}
