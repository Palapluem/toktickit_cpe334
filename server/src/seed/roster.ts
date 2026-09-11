// The seeded user roster. Stub: the tests in tests/lab-03/seed-roster.unit.test.ts
// drive out the composition this must satisfy (testing-contract.md §5).
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
export const DEVELOPMENT_PASSWORD = ''

export const SEED_USERS: readonly SeedUser[] = []

/** The Lab 2 requesters, whose identifiers must survive the migration (BR-40). */
export const LAB2_REQUESTER_EMAILS: readonly string[] = []
