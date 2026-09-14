// Query parsing for the staff queue (api-spec.md §8). Separate from the
// Requester list's parser because it accepts a different set: no
// relatedSystemId, no requestedPriority, and an ownerId the other never sees.
//
// An invalid parameter is a validation failure, never a silent fallback — a
// queue that quietly ignores a filter shows the wrong work.
import type { FieldError } from '../http/errors.js'
import { PRIORITIES, TICKET_STATUSES, UUID } from '../tickets/validation.js'

export type SortDirection = 'asc' | 'desc'
export type Priority = (typeof PRIORITIES)[number]
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export type QueueSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'ticketNo'
  | 'itPriority'
  | 'status'
  | 'lastActivityAt'

/** `unassigned` and `me` are filters, not identifiers; `me` resolves server-side. */
export type OwnerFilter =
  | { kind: 'any' }
  | { kind: 'unassigned' }
  | { kind: 'me' }
  | { kind: 'user'; id: string }

export type QueueQuery = {
  search: string | null
  status: TicketStatus | null
  itPriority: Priority | null
  categoryId: string | null
  owner: OwnerFilter
  sort: { field: QueueSortField; direction: SortDirection }
  page: number
  pageSize: number
}

export type QueueQueryParseResult = {
  value: QueueQuery
  errors: FieldError[]
}

const QUERY_FIELDS = new Set([
  'search',
  'status',
  'itPriority',
  'categoryId',
  'ownerId',
  'sort',
  'page',
  'pageSize',
])

const SORT_FIELDS = new Set<QueueSortField>([
  'createdAt',
  'updatedAt',
  'ticketNo',
  'itPriority',
  'status',
  'lastActivityAt',
])

const SORT_DIRECTIONS = new Set<SortDirection>(['asc', 'desc'])

/**
 * A work queue answers "what is most urgent and has waited longest", which is
 * a different question from My Tickets' "what did I do most recently"
 * (lab-02 BR-37).
 */
export const DEFAULT_QUEUE_SORT = {
  field: 'itPriority' as const,
  direction: 'desc' as const,
}

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafePositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
}

function enumValue<T extends string>(raw: string, allowed: readonly T[]): raw is T {
  return allowed.includes(raw as T)
}

export function parseQueueQuery(query: unknown): QueueQueryParseResult {
  const value: QueueQuery = {
    search: null,
    status: null,
    itPriority: null,
    categoryId: null,
    owner: { kind: 'any' },
    sort: { ...DEFAULT_QUEUE_SORT },
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  }
  const errors: FieldError[] = []

  if (!isRecord(query)) {
    return {
      value,
      errors: [{ field: 'query', message: 'Query parameters are invalid.' }],
    }
  }

  for (const field of Object.keys(query)) {
    if (!QUERY_FIELDS.has(field)) {
      errors.push({ field, message: 'This query parameter is not accepted.' })
    }
  }

  const readSingle = (field: string): string | undefined => {
    const raw = query[field]
    if (raw === undefined) return undefined
    if (typeof raw !== 'string') {
      errors.push({ field, message: 'Use one scalar query value.' })
      return undefined
    }
    return raw
  }

  const search = readSingle('search')
  if (search !== undefined) {
    const trimmed = search.trim()
    if (trimmed.length < 1 || trimmed.length > 150) {
      errors.push({
        field: 'search',
        message: 'Search must be between 1 and 150 characters.',
      })
    } else {
      value.search = trimmed
    }
  }

  const status = readSingle('status')
  if (status !== undefined) {
    if (!enumValue(status, TICKET_STATUSES)) {
      errors.push({ field: 'status', message: 'Choose a valid ticket status.' })
    } else {
      value.status = status
    }
  }

  const itPriority = readSingle('itPriority')
  if (itPriority !== undefined) {
    if (!enumValue(itPriority, PRIORITIES)) {
      errors.push({
        field: 'itPriority',
        message: 'Choose LOW, MEDIUM, HIGH, or URGENT.',
      })
    } else {
      value.itPriority = itPriority
    }
  }

  const categoryId = readSingle('categoryId')
  if (categoryId !== undefined) {
    if (!UUID.test(categoryId)) {
      errors.push({ field: 'categoryId', message: 'Choose a valid category.' })
    } else {
      value.categoryId = categoryId
    }
  }

  const ownerId = readSingle('ownerId')
  if (ownerId !== undefined) {
    if (ownerId === 'unassigned') value.owner = { kind: 'unassigned' }
    else if (ownerId === 'me') value.owner = { kind: 'me' }
    else if (UUID.test(ownerId)) value.owner = { kind: 'user', id: ownerId }
    else {
      errors.push({
        field: 'ownerId',
        message: 'Choose an owner, "unassigned", or "me".',
      })
    }
  }

  const sort = readSingle('sort')
  if (sort !== undefined) {
    const [field, direction, ...extra] = sort.split(':')
    if (
      extra.length > 0 ||
      !SORT_FIELDS.has(field as QueueSortField) ||
      !SORT_DIRECTIONS.has(direction as SortDirection)
    ) {
      errors.push({
        field: 'sort',
        message: 'Sort must use an allowed field and asc or desc direction.',
      })
    } else {
      value.sort = {
        field: field as QueueSortField,
        direction: direction as SortDirection,
      }
    }
  }

  const page = readSingle('page')
  if (page !== undefined) {
    if (!isSafePositiveInteger(page)) {
      errors.push({ field: 'page', message: 'Page must be a positive integer.' })
    } else {
      value.page = Number(page)
    }
  }

  const pageSize = readSingle('pageSize')
  if (pageSize !== undefined) {
    const parsed = Number(pageSize)
    if (!isSafePositiveInteger(pageSize) || parsed > MAX_PAGE_SIZE) {
      errors.push({
        field: 'pageSize',
        message: `Page size must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
      })
    } else {
      value.pageSize = parsed
    }
  }

  return { value, errors }
}
