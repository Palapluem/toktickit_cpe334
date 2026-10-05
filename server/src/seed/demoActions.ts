// Demo Actions Taken (lab-04 specification §7, BR-42): zero, one and several per Ticket, every status,
// and owner, performer and assignee that differ. Five seeded Tickets deliberately keep no Actions.
import { seedTicketNo } from './demoTickets.js'

export type SeedActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type SeedAction = {
  id: string
  requestId: string
  ticketNo: string
  description: string
  result: string | null
  followUpRequired: boolean
  followUpNote: string | null
  attachmentNotes: string | null
  status: SeedActionStatus
  assigneeEmail: string
  performedByEmail: string
  /** Who completed or cancelled it; null while it is open. */
  closedByEmail: string | null
  cancellationReason: string | null
  /** Hours after the Ticket's own creation time, so re-running the seed writes the same instants. */
  offsetHours: number
}

// Fixed identifiers, so re-running the seed updates rather than duplicates.
const actionId = (n: number): string => `33333333-3333-4333-8333-${String(n).padStart(12, '0')}`
const requestId = (n: number): string => `44444444-4444-4444-8444-${String(n).padStart(12, '0')}`

const STAFF = {
  patricia: 'patricia.evans@example.ac.th',
  daniel: 'daniel.carter@example.ac.th',
  olivia: 'olivia.reed@example.ac.th',
} as const

const open = {
  result: null,
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  closedByEmail: null,
  cancellationReason: null,
} as const

export const SEED_ACTIONS: readonly SeedAction[] = [
  {
    ...open,
    id: actionId(1),
    requestId: requestId(1),
    ticketNo: seedTicketNo(3),
    description: 'Review the mail relay allow-list after the migration.',
    status: 'PLANNED',
    assigneeEmail: STAFF.patricia,
    performedByEmail: STAFF.patricia,
    offsetHours: 3,
  },
  {
    ...open,
    id: actionId(2),
    requestId: requestId(2),
    ticketNo: seedTicketNo(4),
    description: 'Reproduce the 10 MB upload failure on a test account.',
    result: 'Reproduced; the proxy rejects request bodies over 10 MB.',
    attachmentNotes: 'See the failing-upload screenshot on this Ticket.',
    status: 'COMPLETED',
    assigneeEmail: STAFF.daniel,
    performedByEmail: STAFF.daniel,
    closedByEmail: STAFF.daniel,
    offsetHours: 3,
  },
  {
    ...open,
    id: actionId(3),
    requestId: requestId(3),
    ticketNo: seedTicketNo(4),
    description: "Raise the proxy body limit to match the application's 25 MB.",
    status: 'IN_PROGRESS',
    assigneeEmail: STAFF.olivia,
    performedByEmail: STAFF.daniel,
    offsetHours: 3.5,
  },
  {
    ...open,
    id: actionId(4),
    requestId: requestId(4),
    ticketNo: seedTicketNo(4),
    description: 'Confirm with the requester that uploads over 10 MB now succeed.',
    followUpRequired: true,
    followUpNote: "Ask the requester to retry before Friday's deadline.",
    status: 'PLANNED',
    assigneeEmail: STAFF.daniel,
    performedByEmail: STAFF.olivia,
    offsetHours: 4,
  },
  {
    ...open,
    id: actionId(5),
    requestId: requestId(5),
    ticketNo: seedTicketNo(6),
    description: 'Run the battery diagnostic on the laptop.',
    result: 'Battery health is at 61 percent; a replacement has been ordered.',
    status: 'COMPLETED',
    assigneeEmail: STAFF.patricia,
    performedByEmail: STAFF.patricia,
    closedByEmail: STAFF.patricia,
    offsetHours: 3,
  },
  {
    ...open,
    id: actionId(6),
    requestId: requestId(6),
    ticketNo: seedTicketNo(6),
    description: 'Collect a sample power adapter for testing.',
    status: 'CANCELLED',
    assigneeEmail: STAFF.daniel,
    performedByEmail: STAFF.patricia,
    closedByEmail: STAFF.patricia,
    cancellationReason: 'The requester brought the laptop in, so no sample was needed.',
    offsetHours: 3.5,
  },
  {
    ...open,
    id: actionId(7),
    requestId: requestId(7),
    ticketNo: seedTicketNo(7),
    description: 'Regenerate the grade export with the corrected template.',
    result: 'Export regenerated and checked against the course roster.',
    status: 'COMPLETED',
    assigneeEmail: STAFF.olivia,
    performedByEmail: STAFF.daniel,
    closedByEmail: STAFF.olivia,
    offsetHours: 3,
  },
  {
    ...open,
    id: actionId(8),
    requestId: requestId(8),
    ticketNo: seedTicketNo(10),
    description: 'Allow the conference registration domain through the guest network filter.',
    status: 'IN_PROGRESS',
    assigneeEmail: STAFF.patricia,
    performedByEmail: STAFF.patricia,
    offsetHours: 3,
  },
]
