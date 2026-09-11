// Demo Tickets, Public Comments, and Internal Notes for the staff queue.
// Stub: tests/lab-03/seed-roster.unit.test.ts drives out the coverage required.
export type SeedTicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED'

export type SeedPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type SeedEntry = {
  id: string
  authorEmail: string
  body: string
}

export type SeedTicket = {
  ticketNo: string
  requesterEmail: string
  ownerEmail: string | null
  categoryName: string
  relatedSystemName: string
  summary: string
  description: string
  requestedPriority: SeedPriority
  itPriority: SeedPriority
  status: SeedTicketStatus
  requesterResolved: boolean
  comments: readonly SeedEntry[]
  notes: readonly SeedEntry[]
}

/**
 * Seeded Ticket Numbers occupy a reserved 9xxxxx band so they can never collide
 * with a runtime allocation, which would have to reach 900,000 Tickets first.
 */
export const SEED_TICKET_BAND = 900_000

export const SEED_TICKETS: readonly SeedTicket[] = []
