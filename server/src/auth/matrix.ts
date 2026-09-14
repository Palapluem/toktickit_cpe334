// The authorization matrix from specification.md §8.1, as data.
//
// An operation absent from this table is denied, never permitted by default
// (BR-12, SEC-020). That is why lookups go through grantFor rather than
// indexing the record directly: an unknown key returns a refusal, not undefined.
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

const R = 'REQUESTER'
const S = 'IT_STAFF'
const A = 'ADMINISTRATOR'

// Reading order matches §8.1 so the two can be compared line by line.
const MATRIX: Record<Operation, Partial<Record<Role, Scope>>> = {
  'ticket:create': { [R]: 'own' },
  'ticket:listOwn': { [R]: 'own' },
  'ticket:read': { [R]: 'own', [S]: 'any', [A]: 'any' },
  // All three may attempt a transition; §5.1 decides which one (see transitions.ts).
  'ticket:setStatus': { [R]: 'own', [S]: 'any', [A]: 'any' },
  'ticket:setOwner': { [S]: 'any', [A]: 'any' },
  'ticket:setItPriority': { [S]: 'any', [A]: 'any' },
  'ticket:requesterResolution': { [R]: 'own' },
  'attachment:manage': { [R]: 'own', [S]: 'any', [A]: 'any' },
  'comment:read': { [R]: 'own', [S]: 'any', [A]: 'any' },
  'comment:create': { [R]: 'own', [S]: 'any', [A]: 'any' },
  'note:read': { [S]: 'any', [A]: 'any' },
  'note:create': { [S]: 'any', [A]: 'any' },
  'staffQueue:read': { [S]: 'any', [A]: 'any' },
  // IT Staff never gain user management: that is where the conceptual
  // separation carries security weight (§8.1, §11.8).
  'user:list': { [A]: 'any' },
  'user:write': { [A]: 'any' },
  'user:setInitialPassword': { [A]: 'any' },
}

export const OPERATIONS: readonly Operation[] = Object.freeze(
  Object.keys(MATRIX) as Operation[],
)

export function grantFor(role: Role, operation: string): Grant {
  // Own property only: a name like "toString" must not resolve to a grant.
  if (!Object.hasOwn(MATRIX, operation)) return null
  return MATRIX[operation as Operation][role] ?? null
}

export function may(role: Role, operation: string): boolean {
  return grantFor(role, operation) !== null
}
