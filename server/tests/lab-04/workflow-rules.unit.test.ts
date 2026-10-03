// UNIT-04 to UNIT-06 · lab-04 BR-20, BR-23, BR-29, BR-30, AC-18, AC-24 — the pure rules behind the Ticket workflow.
// The status table below is transcribed from specification §5.2, not read from the implementation.
import { describe, expect, it } from 'vitest'
import {
  actionAssignedPayload,
  actionCreatedPayload,
  actionMovedPayload,
  actionUpdatedPayload,
  ownerChangedPayload,
  priorityChangedPayload,
  statusChangedPayload,
} from '../../src/actions/events.js'
import type { Role } from '../../src/auth/types.js'
import type { TicketStatus } from '../../src/tickets/transitions.js'
import { CREATION_ORDER, byCreation, workflowFor } from '../../src/tickets/workflowRules.js'

const REQUESTER_EDGES: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['CANCELLED'],
  OPEN: [],
  IN_PROGRESS: [],
  WAITING_FOR_REQUESTER: [],
  RESOLVED: ['REOPENED'],
  CLOSED: [],
  REOPENED: [],
  CANCELLED: [],
}
const STAFF_EDGES: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  CANCELLED: [],
}
const STATUSES = Object.keys(STAFF_EDGES) as TicketStatus[]
const ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']
const GATED: TicketStatus[] = ['RESOLVED', 'CLOSED']

const edgesFor = (role: Role, from: TicketStatus) => (role === 'REQUESTER' ? REQUESTER_EDGES[from] : STAFF_EDGES[from])

describe('UNIT-04 · AC-18 · BR-20 · BR-23 · the gate-aware transition table (role × status × open Actions)', () => {
  for (const role of ROLES) {
    for (const from of STATUSES) {
      for (const open of [0, 1, 2, 50]) {
        it(`${role} from ${from} with ${open} open Action${open === 1 ? '' : 's'}`, () => {
          const edges = edgesFor(role, from)
          const result = workflowFor(role, from, open)
          const held = open > 0 ? edges.filter((to) => GATED.includes(to)) : []

          expect(result.permitted).toEqual(edges.filter((to) => !held.includes(to)))
          expect(result.blocked).toEqual(held.map((status) => ({ status, reason: 'OPEN_ACTIONS', openActionCount: open })))
        })
      }
    }
  }

  it('actually blocks something somewhere, so the table above is not vacuous', () => {
    const blocked = STATUSES.flatMap((from) => workflowFor('IT_STAFF', from, 3).blocked)
    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.every((entry) => entry.openActionCount === 3)).toBe(true)
  })

  it('never blocks a Requester, who has no resolving move to hold back', () => {
    for (const from of STATUSES) expect(workflowFor('REQUESTER', from, 5).blocked).toEqual([])
  })
})

describe('UNIT-05 · AC-24 · BR-29 · records are ordered by creation time, then identifier', () => {
  const at = (iso: string) => new Date(iso)
  const rec = (id: string, iso: string) => ({ id, createdAt: at(iso) })

  it('puts the earlier record first whatever the identifiers', () => {
    expect(byCreation(rec('f', '2026-10-04T01:00:00Z'), rec('a', '2026-10-04T02:00:00Z'))).toBeLessThan(0)
    expect(byCreation(rec('a', '2026-10-04T02:00:00Z'), rec('f', '2026-10-04T01:00:00Z'))).toBeGreaterThan(0)
  })

  it('breaks an exact tie by identifier, digits before letters, like the database orders a uuid', () => {
    const same = '2026-10-04T01:00:00.000Z'
    expect(byCreation(rec('9aaa', same), rec('aaaa', same))).toBeLessThan(0)
    expect(byCreation(rec('b000', same), rec('a999', same))).toBeGreaterThan(0)
    expect(byCreation(rec('a000', same), rec('a000', same))).toBe(0)
  })

  it('treats two Date objects for one instant as equal', () => {
    expect(byCreation({ id: 'x', createdAt: new Date(1_000) }, { id: 'x', createdAt: new Date(1_000) })).toBe(0)
  })

  it('gives one order for every permutation of records that share timestamps', () => {
    const records = [
      rec('c3', '2026-10-04T01:00:00Z'),
      rec('a1', '2026-10-04T01:00:00Z'),
      rec('b2', '2026-10-04T01:00:00Z'),
      rec('d4', '2026-10-04T00:59:59Z'),
      rec('e5', '2026-10-04T01:00:01Z'),
    ]
    const permutations = (items: typeof records): (typeof records)[] =>
      items.length <= 1 ? [items] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]))
    const all = permutations(records)
    expect(all).toHaveLength(120)
    for (const arrangement of all) {
      expect([...arrangement].sort(byCreation).map((r) => r.id)).toEqual(['d4', 'a1', 'b2', 'c3', 'e5'])
    }
  })

  it('names the same order for the database queries', () => {
    expect(CREATION_ORDER).toEqual([{ createdAt: 'asc' }, { id: 'asc' }])
  })
})

describe('UNIT-06 · BR-30 · an event payload holds identifiers, statuses, priorities and field names only', () => {
  const uuid = '8f14e45f-ceea-4a67-9c1d-0123456789ab'
  const other = '0b1c2d3e-4f50-4a61-8b72-89abcdef0123'
  const poison = 'My password is hunter2 and my email is a@b.c'

  it('builds each payload from its listed inputs', () => {
    expect(statusChangedPayload({ from: 'IN_PROGRESS', to: 'RESOLVED' })).toEqual({ from: 'IN_PROGRESS', to: 'RESOLVED' })
    expect(statusChangedPayload({ from: 'OPEN', to: 'CANCELLED', cascadedActionCount: 2 })).toEqual({
      from: 'OPEN',
      to: 'CANCELLED',
      cascadedActionCount: 2,
    })
    expect(ownerChangedPayload({ fromOwnerId: null, toOwnerId: uuid })).toEqual({ fromOwnerId: null, toOwnerId: uuid })
    expect(priorityChangedPayload({ from: 'LOW', to: 'URGENT' })).toEqual({ from: 'LOW', to: 'URGENT' })
    expect(actionCreatedPayload({ assigneeId: uuid })).toEqual({ assigneeId: uuid })
    expect(actionUpdatedPayload(['description', 'result'])).toEqual({ changedFields: ['description', 'result'] })
    expect(actionAssignedPayload({ fromAssigneeId: uuid, toAssigneeId: other })).toEqual({ fromAssigneeId: uuid, toAssigneeId: other })
    expect(actionMovedPayload({ from: 'PLANNED', to: 'IN_PROGRESS' })).toEqual({ from: 'PLANNED', to: 'IN_PROGRESS' })
    expect(actionMovedPayload({ from: 'IN_PROGRESS', to: 'CANCELLED', cascade: true })).toEqual({
      from: 'IN_PROGRESS',
      to: 'CANCELLED',
      cascade: true,
    })
  })

  it('reports a cancellation as a cascade or not, and a Ticket status change to anything else without a count', () => {
    expect(actionMovedPayload({ from: 'PLANNED', to: 'CANCELLED' })).toEqual({ from: 'PLANNED', to: 'CANCELLED', cascade: false })
    expect(statusChangedPayload({ from: 'OPEN', to: 'IN_PROGRESS', cascadedActionCount: 4 })).toEqual({ from: 'OPEN', to: 'IN_PROGRESS' })
  })

  it('carries no property it was not asked for, whatever else the caller passes in', () => {
    const smuggled = { description: poison, comment: poison, email: poison, body: poison }
    const built = [
      statusChangedPayload({ from: 'OPEN', to: 'CANCELLED', cascadedActionCount: 1, ...smuggled }),
      ownerChangedPayload({ fromOwnerId: uuid, toOwnerId: other, ...smuggled }),
      priorityChangedPayload({ from: 'LOW', to: 'HIGH', ...smuggled }),
      actionCreatedPayload({ assigneeId: uuid, ...smuggled }),
      actionAssignedPayload({ fromAssigneeId: uuid, toAssigneeId: other, ...smuggled }),
      actionMovedPayload({ from: 'PLANNED', to: 'CANCELLED', cascade: true, ...smuggled }),
    ]
    expect(built.every((payload) => Object.keys(payload).length > 0), 'every builder produced something').toBe(true)
    for (const payload of built) expect(JSON.stringify(payload)).not.toContain('hunter2')
  })

  it('refuses a changed-field list that names anything but an Action field', () => {
    expect(() => actionUpdatedPayload(['description', poison])).toThrow()
    expect(() => actionUpdatedPayload(['Description'])).toThrow()
    expect(() => actionUpdatedPayload([])).toThrow()
  })

  it('refuses a status, a priority or an identifier that is really free text', () => {
    expect(() => statusChangedPayload({ from: 'OPEN', to: poison })).toThrow()
    expect(() => priorityChangedPayload({ from: 'LOW', to: poison })).toThrow()
    expect(() => ownerChangedPayload({ fromOwnerId: poison, toOwnerId: null })).toThrow()
    expect(() => actionCreatedPayload({ assigneeId: poison })).toThrow()
    expect(() => actionMovedPayload({ from: 'PLANNED', to: poison })).toThrow()
  })
})
