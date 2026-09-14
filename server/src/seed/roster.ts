// The seeded user roster (specification.md §7). Keyed on email so the Lab 2
// requesters keep their identifiers through the migration (BR-40).
export type SeedRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'

export type SeedUser = {
  displayName: string
  email: string
  role: SeedRole
  isActive: boolean
}

/**
 * The one place the local development password is written (SEC-033).
 * Local lab only. It is never a real credential: every seeded and migrated
 * account carries mustChangePassword, so it opens exactly one screen (BR-06).
 */
export const DEVELOPMENT_PASSWORD = 'TokTickIT-Lab3-Dev!'

const DOMAIN = 'example.ac.th'

const email = (name: string): string =>
  `${name.toLowerCase().replace(/ /g, '.')}@${DOMAIN}`

const user = (
  displayName: string,
  role: SeedRole,
  isActive = true,
): SeedUser => ({ displayName, email: email(displayName), role, isActive })

/**
 * One inactive account per staffed role, so BR-01 and BR-16 can be proved
 * rather than assumed — the same reason Lab 2 seeded an inactive requester.
 */
export const SEED_USERS: readonly SeedUser[] = [
  user('Jennifer Anderson', 'REQUESTER'),
  user('Michael Brown', 'REQUESTER'),
  user('Sarah Johnson', 'REQUESTER'),
  user('David Lee', 'REQUESTER'),
  user('Robert Wilson', 'REQUESTER', false),

  user('Patricia Evans', 'IT_STAFF'),
  user('Daniel Carter', 'IT_STAFF'),
  user('Olivia Reed', 'IT_STAFF'),
  user('Thomas Fletcher', 'IT_STAFF', false),

  user('Margaret Hale', 'ADMINISTRATOR'),
]

/** The Lab 2 requesters, whose identifiers must survive the migration (BR-40). */
export const LAB2_REQUESTER_EMAILS: readonly string[] = [
  'jennifer.anderson@example.ac.th',
  'michael.brown@example.ac.th',
  'sarah.johnson@example.ac.th',
  'david.lee@example.ac.th',
  'robert.wilson@example.ac.th',
]
