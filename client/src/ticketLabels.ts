// Readable names for the values the server sends as identifiers (lab-04 ui-spec §7). The badges keep the
// raw value on purpose; sentences use these.
import type { Priority, TicketStatus } from './components/Badge.js'

const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

/** An unknown value is shown as received rather than hidden. */
export const statusLabel = (status: string): string => STATUS_LABEL[status as TicketStatus] ?? status
export const priorityLabel = (priority: string): string => PRIORITY_LABEL[priority as Priority] ?? priority

/** "Resolved", "Resolved and Closed", "A, B and C". */
export function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join('')
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

export const pluralActions = (count: number): string => `${count} open ${count === 1 ? 'Action' : 'Actions'}`
