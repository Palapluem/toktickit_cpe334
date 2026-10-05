import type { Prisma } from '../generated/prisma/client.js'

export type MetricName = 'unassigned' | 'assignedToMe' | 'urgent' | 'waitingForRequester'
export type RequesterMetricName = 'open' | 'needsAttention' | 'resolved' | 'closed'

export const ACTIVE_STATUSES = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'REOPENED',
] as const

export const STAFF_METRIC_QUERIES: Record<MetricName, Record<string, string>> = {
  unassigned: { ownerId: 'unassigned', statusGroup: 'active' },
  assignedToMe: { ownerId: 'me', statusGroup: 'active' },
  urgent: { itPriority: 'URGENT', statusGroup: 'active' },
  waitingForRequester: { status: 'WAITING_FOR_REQUESTER' },
}
export const REQUESTER_METRIC_QUERIES: Record<RequesterMetricName, Record<string, string>> = {
  open: { statusGroup: 'active' },
  needsAttention: { status: 'WAITING_FOR_REQUESTER' },
  resolved: { status: 'RESOLVED' },
  closed: { status: 'CLOSED' },
}

export function activeTicketWhere(): Prisma.TicketWhereInput {
  return { status: { in: [...ACTIVE_STATUSES] } }
}

export function staffMetricWhere(name: MetricName, staffId: string): Prisma.TicketWhereInput {
  switch (name) {
    case 'unassigned':
      return { ownerId: null, ...activeTicketWhere() }
    case 'assignedToMe':
      return { ownerId: staffId, ...activeTicketWhere() }
    case 'urgent':
      return { itPriority: 'URGENT', ...activeTicketWhere() }
    case 'waitingForRequester':
      return { status: 'WAITING_FOR_REQUESTER' }
  }
}

export function requesterMetricWhere(
  name: RequesterMetricName,
  requesterId: string,
): Prisma.TicketWhereInput {
  const scope = { requesterId }
  switch (name) {
    case 'open':
      return { ...scope, ...activeTicketWhere() }
    case 'needsAttention':
      return { ...scope, status: 'WAITING_FOR_REQUESTER' }
    case 'resolved':
      return { ...scope, status: 'RESOLVED' }
    case 'closed':
      return { ...scope, status: 'CLOSED' }
  }
}
