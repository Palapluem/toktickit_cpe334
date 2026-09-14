// Where each role goes, in one place. The navigation, the post-login redirect,
// and the change-password redirect all read this, so they cannot disagree.
import type { Role } from './api.js'

export const LOGIN_ROUTE = '/login'
export const CHANGE_PASSWORD_ROUTE = '/change-password'

export type Destination = { label: string; path: string }

const NAVIGATION: Record<Role, Destination[]> = {
  REQUESTER: [
    { label: 'My Tickets', path: '/tickets' },
    { label: 'Create Ticket', path: '/tickets/new' },
  ],
  IT_STAFF: [{ label: 'Ticket Queue', path: '/staff/tickets' }],
  ADMINISTRATOR: [
    { label: 'Ticket Queue', path: '/staff/tickets' },
    { label: 'User Management', path: '/admin/users' },
  ],
}

/** An unauthorised destination is absent, never disabled (ui-spec §5). */
export function navigationFor(role: Role): Destination[] {
  return NAVIGATION[role] ?? []
}

export function homeFor(role: Role): string {
  return navigationFor(role)[0]?.path ?? '/tickets'
}
