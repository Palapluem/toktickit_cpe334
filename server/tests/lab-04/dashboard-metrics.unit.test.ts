// UNIT-07 · BR-36, BR-37 · the Dashboard and both lists share one ACTIVE predicate.
import { describe, expect, it } from 'vitest'
import {
  ACTIVE_STATUSES,
  REQUESTER_METRIC_QUERIES,
  STAFF_METRIC_QUERIES,
  activeTicketWhere,
  requesterMetricWhere,
  staffMetricWhere,
} from '../../src/dashboard/metrics.js'

const ACTIVE = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']

describe('UNIT-07 · BR-36 · ACTIVE is exactly the five specified statuses', () => {
  it('excludes terminal statuses', () => {
    expect(ACTIVE_STATUSES).toEqual(ACTIVE)
    expect(activeTicketWhere()).toEqual({ status: { in: ACTIVE } })
  })
})

describe('UNIT-07 · BR-37 · staff metric predicates and returned query objects agree', () => {
  const staffId = 'staff-uuid'
  it.each([
    ['unassigned', { ownerId: null, status: { in: ACTIVE } }, { ownerId: 'unassigned', statusGroup: 'active' }],
    ['assignedToMe', { ownerId: staffId, status: { in: ACTIVE } }, { ownerId: 'me', statusGroup: 'active' }],
    ['urgent', { itPriority: 'URGENT', status: { in: ACTIVE } }, { itPriority: 'URGENT', statusGroup: 'active' }],
    ['waitingForRequester', { status: 'WAITING_FOR_REQUESTER' }, { status: 'WAITING_FOR_REQUESTER' }],
  ] as const)('%s uses the same predicate as its drill-down', (name, where, query) => {
    expect(staffMetricWhere(name, staffId)).toEqual(where)
    expect(STAFF_METRIC_QUERIES[name]).toEqual(query)
  })
})

describe('UNIT-07 · BR-37, BR-39 · requester metrics always retain ownership', () => {
  const requesterId = 'requester-uuid'
  it.each([
    ['open', { requesterId, status: { in: ACTIVE } }, { statusGroup: 'active' }],
    ['needsAttention', { requesterId, status: 'WAITING_FOR_REQUESTER' }, { status: 'WAITING_FOR_REQUESTER' }],
    ['resolved', { requesterId, status: 'RESOLVED' }, { status: 'RESOLVED' }],
    ['closed', { requesterId, status: 'CLOSED' }, { status: 'CLOSED' }],
  ] as const)('%s predicate is caller-scoped and its query is exact', (name, where, query) => {
    expect(requesterMetricWhere(name, requesterId)).toEqual(where)
    expect(REQUESTER_METRIC_QUERIES[name]).toEqual(query)
  })
})
