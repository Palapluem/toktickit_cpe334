// Ticket workflow rules (lab-04 BR-19 to BR-24, BR-29). STUB: neutral values until the rules are written.
import type { Role } from '../auth/types.js'
import { allowedTransitions, type TicketStatus } from './transitions.js'

export const OPEN_ACTION_STATUSES = ['PLANNED', 'IN_PROGRESS'] as const

export type BlockedTransition = { status: 'RESOLVED' | 'CLOSED'; reason: 'OPEN_ACTIONS'; openActionCount: number }

export function workflowFor(
  role: Role,
  from: TicketStatus,
  _openActionCount: number,
): { permitted: TicketStatus[]; blocked: BlockedTransition[] } {
  return { permitted: [...allowedTransitions(role, from)], blocked: [] }
}

export const CREATION_ORDER = [] as const

export function byCreation(_a: { createdAt: Date; id: string }, _b: { createdAt: Date; id: string }): number {
  return 0
}
