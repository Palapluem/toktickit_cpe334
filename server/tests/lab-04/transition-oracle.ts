// The Ticket status table transcribed from specification §5.2, so no test takes its expectation from the code it tests.
import type { Role } from '../../src/auth/types.js'
import type { TicketStatus } from '../../src/tickets/transitions.js'

export const REQUESTER_EDGES: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['CANCELLED'],
  OPEN: [],
  IN_PROGRESS: [],
  WAITING_FOR_REQUESTER: [],
  RESOLVED: ['REOPENED'],
  CLOSED: [],
  REOPENED: [],
  CANCELLED: [],
}

export const STAFF_EDGES: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
}

export const STATUSES = Object.keys(STAFF_EDGES) as TicketStatus[]

/** The Administrator's column is the IT Staff's (specification §5.2). */
export const edgesFor = (role: Role, from: TicketStatus): TicketStatus[] => (role === 'REQUESTER' ? REQUESTER_EDGES[from] : STAFF_EDGES[from])
