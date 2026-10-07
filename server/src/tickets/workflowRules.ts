// Ticket workflow rules (lab-04 BR-19 to BR-24, BR-29): what a role may do next, and the order records appear in.
import type { Role } from '../auth/types.js'
import { allowedTransitions, type TicketStatus } from './transitions.js'

/** An Action in either of these is open work (BR-20). */
export const OPEN_ACTION_STATUSES = ['PLANNED', 'IN_PROGRESS'] as const

export type BlockedTransition = { status: 'RESOLVED' | 'CLOSED'; reason: 'OPEN_ACTIONS'; openActionCount: number }

const isHeldBack = (status: TicketStatus): status is BlockedTransition['status'] => status === 'RESOLVED' || status === 'CLOSED'

/** The moves on offer: the Lab 3 table minus RESOLVED and CLOSED while work is open, with the reason for each omission (AC-18). */
export function workflowFor(
  role: Role,
  from: TicketStatus,
  openActionCount: number,
): { permitted: TicketStatus[]; blocked: BlockedTransition[] } {
  const edges = allowedTransitions(role, from)
  if (openActionCount <= 0) return { permitted: [...edges], blocked: [] }
  return {
    permitted: edges.filter((to) => !isHeldBack(to)),
    blocked: edges.filter(isHeldBack).map((status) => ({ status, reason: 'OPEN_ACTIONS' as const, openActionCount })),
  }
}

/** Creation time, then identifier, so equal timestamps keep one order (BR-29). The database form of `byCreation`. */
export const CREATION_ORDER = [{ createdAt: 'asc' as const }, { id: 'asc' as const }] as const

/** Plain string comparison matches how PostgreSQL orders a uuid. */
export function byCreation(a: { createdAt: Date; id: string }, b: { createdAt: Date; id: string }): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime()
  if (byTime !== 0) return byTime
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}
