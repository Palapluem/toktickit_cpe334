// The authorization matrix from specification.md §8.1, as data.
// Stub: tests/lab-03/authorization.unit.test.ts drives out the table.
//
// An operation absent from this table is denied, never permitted by default
// (BR-12, SEC-020). That is why lookups go through grantFor rather than
// indexing the record directly.
import type { Role } from './types.js'

export type Operation =
  | 'ticket:create'
  | 'ticket:listOwn'
  | 'ticket:read'
  | 'ticket:setStatus'
  | 'ticket:setOwner'
  | 'ticket:setItPriority'
  | 'ticket:requesterResolution'
  | 'attachment:manage'
  | 'comment:read'
  | 'comment:create'
  | 'note:read'
  | 'note:create'
  | 'staffQueue:read'
  | 'user:list'
  | 'user:write'
  | 'user:setInitialPassword'

/**
 * How far the grant reaches over objects. `own` means the authenticated user
 * must be the Ticket's requester; `any` means every record of that kind.
 * Authorization decides on subject, action, and object — not role alone (SEC-017).
 */
export type Scope = 'own' | 'any'

/** null is a refusal, and is what an unlisted cell resolves to. */
export type Grant = Scope | null

export const OPERATIONS: readonly Operation[] = []

export function grantFor(_role: Role, _operation: string): Grant {
  return null
}

export function may(role: Role, operation: string): boolean {
  return grantFor(role, operation) !== null
}
