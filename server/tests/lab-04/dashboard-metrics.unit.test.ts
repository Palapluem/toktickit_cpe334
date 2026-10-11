// UNIT-07 · BR-36, BR-37 · the Dashboard and both lists share one ACTIVE predicate, and each metric links to the list that shows its Tickets.
// The counts themselves come from SQL in dashboards.ts and are checked against independent SQL by DASH-01 to DASH-10.
import { describe, expect, it } from 'vitest'
import {
  ACTIVE_STATUSES,
  REQUESTER_METRIC_QUERIES,
  STAFF_METRIC_QUERIES,
  activeTicketWhere,
} from '../../src/dashboard/metrics.js'

const ACTIVE = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']

describe('UNIT-07 · BR-36 · ACTIVE is exactly the five specified statuses', () => {
  it('excludes terminal statuses, in the dashboard SQL and in both lists', () => {
    expect(ACTIVE_STATUSES).toEqual(ACTIVE)
    expect(activeTicketWhere()).toEqual({ status: { in: ACTIVE } })
  })
})

describe('UNIT-07 · BR-37 · the drill-down query each staff metric returns', () => {
  it.each([
    ['unassigned', { ownerId: 'unassigned', statusGroup: 'active' }],
    ['assignedToMe', { ownerId: 'me', statusGroup: 'active' }],
    ['urgent', { itPriority: 'URGENT', statusGroup: 'active' }],
    ['waitingForRequester', { status: 'WAITING_FOR_REQUESTER' }],
  ] as const)('%s', (name, query) => {
    expect(STAFF_METRIC_QUERIES[name]).toEqual(query)
  })
})

describe('UNIT-07 · BR-37, BR-39 · the drill-down query each Requester metric returns', () => {
  it.each([
    ['open', { statusGroup: 'active' }],
    ['needsAttention', { status: 'WAITING_FOR_REQUESTER' }],
    ['resolved', { status: 'RESOLVED' }],
    ['closed', { status: 'CLOSED' }],
  ] as const)('%s', (name, query) => {
    expect(REQUESTER_METRIC_QUERIES[name]).toEqual(query)
  })
})
