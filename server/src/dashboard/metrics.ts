// Neutral module shape for UNIT-07's red phase; behavior is implemented after the tests fail.
export type MetricName = 'unassigned' | 'assignedToMe' | 'urgent' | 'waitingForRequester'
export type RequesterMetricName = 'open' | 'needsAttention' | 'resolved' | 'closed'

export const ACTIVE_STATUSES: readonly string[] = []
export const STAFF_METRIC_QUERIES: Record<MetricName, Record<string, string>> = {
  unassigned: {},
  assignedToMe: {},
  urgent: {},
  waitingForRequester: {},
}
export const REQUESTER_METRIC_QUERIES: Record<RequesterMetricName, Record<string, string>> = {
  open: {},
  needsAttention: {},
  resolved: {},
  closed: {},
}

export function activeTicketWhere(): Record<string, unknown> {
  return {}
}

export function staffMetricWhere(_name: MetricName, _staffId: string): Record<string, unknown> {
  return {}
}

export function requesterMetricWhere(
  _name: RequesterMetricName,
  _requesterId: string,
): Record<string, unknown> {
  return {}
}
