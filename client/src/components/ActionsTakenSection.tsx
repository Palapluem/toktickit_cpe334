// Actions Taken on Ticket Detail (lab-04 ui-spec §5). STUB: renders nothing until the section is written.
import type { AssignableOwner, TicketStatus } from '../api.js'

export type ActionsTakenSectionProps = {
  ticketId: string
  ticketStatus: TicketStatus
  audience: 'staff' | 'requester'
  assignableOwners?: AssignableOwner[]
  currentUserId?: string
  /** Called after a change so the Ticket (version, status, history) is reloaded. */
  onChanged?: () => void
}

export function ActionsTakenSection(_props: ActionsTakenSectionProps) {
  return null
}
