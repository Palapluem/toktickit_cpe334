import type { FieldError } from '../http/errors.js'
import {
  PRIORITIES,
  TICKET_STATUSES,
  UUID,
} from './validation.js'

export type SortDirection = 'asc' | 'desc'
export type Priority = (typeof PRIORITIES)[number]
export type TicketStatus = (typeof TICKET_STATUSES)[number]
export type SortField =
  | 'createdAt'
  | 'updatedAt'
  | 'ticketNo'
  | 'summary'
  | 'requestedPriority'
  | 'status'

export type TicketListQuery = {
  search: string | null
  categoryId: string | null
  relatedSystemId: string | null
  requestedPriority: Priority | null
  itPriority: Priority | null
  status: TicketStatus | null
  sort: { field: SortField; direction: SortDirection }
  page: number
  pageSize: number
}

export type TicketQueryParseResult = {
  value: TicketListQuery
  errors: FieldError[]
}

const QUERY_FIELDS = new Set([
  'search',
  'categoryId',
  'relatedSystemId',
  'requestedPriority',
  'itPriority',
  'status',
  'sort',
  'page',
  'pageSize',
])

const SORT_FIELDS = new Set<SortField>([
  'createdAt',
  'updatedAt',
  'ticketNo',
  'summary',
  'requestedPriority',
  'status',
])

const SORT_DIRECTIONS = new Set<SortDirection>(['asc', 'desc'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isSafePositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
}

function enumValue<T extends string>(
  raw: string,
  allowed: readonly T[],
): raw is T {
  return allowed.includes(raw as T)
}

export function parseTicketQuery(query: unknown): TicketQueryParseResult {
  const value: TicketListQuery = {
    search: null,
    categoryId: null,
    relatedSystemId: null,
    requestedPriority: null,
    itPriority: null,
    status: null,
    sort: { field: 'createdAt', direction: 'desc' },
    page: 1,
    pageSize: 10,
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
    if (!isString(raw)) {
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

  const categoryId = readSingle('categoryId')
  if (categoryId !== undefined) {
    if (!UUID.test(categoryId)) {
      errors.push({ field: 'categoryId', message: 'Choose a valid category.' })
    } else {
      value.categoryId = categoryId
    }
  }

  const relatedSystemId = readSingle('relatedSystemId')
  if (relatedSystemId !== undefined) {
    if (!UUID.test(relatedSystemId)) {
      errors.push({
        field: 'relatedSystemId',
        message: 'Choose a valid related system.',
      })
    } else {
      value.relatedSystemId = relatedSystemId
    }
  }

  const requestedPriority = readSingle('requestedPriority')
  if (requestedPriority !== undefined) {
    if (!enumValue(requestedPriority, PRIORITIES)) {
      errors.push({
        field: 'requestedPriority',
        message: 'Choose LOW, MEDIUM, HIGH, or URGENT.',
      })
    } else {
      value.requestedPriority = requestedPriority
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

  const status = readSingle('status')
  if (status !== undefined) {
    if (!enumValue(status, TICKET_STATUSES)) {
      errors.push({ field: 'status', message: 'Choose a valid ticket status.' })
    } else {
      value.status = status
    }
  }

  const sort = readSingle('sort')
  if (sort !== undefined) {
    const [field, direction, ...extra] = sort.split(':')
    if (
      extra.length > 0 ||
      !SORT_FIELDS.has(field as SortField) ||
      !SORT_DIRECTIONS.has(direction as SortDirection)
    ) {
      errors.push({
        field: 'sort',
        message: 'Sort must use an allowed field and asc or desc direction.',
      })
    } else {
      value.sort = {
        field: field as SortField,
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
    const parsedPageSize = Number(pageSize)
    if (!isSafePositiveInteger(pageSize) || parsedPageSize > 50) {
      errors.push({
        field: 'pageSize',
        message: 'Page size must be an integer between 1 and 50.',
      })
    } else {
      value.pageSize = parsedPageSize
    }
  }

  return {
    value,
    errors,
  }
}
