import type { FieldError } from '../http/errors.js'

export type SortDirection = 'asc' | 'desc'
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
  requestedPriority: string | null
  itPriority: string | null
  status: string | null
  sort: { field: SortField; direction: SortDirection }
  page: number
  pageSize: number
}

export type TicketQueryParseResult = {
  value: TicketListQuery
  errors: FieldError[]
}

export function parseTicketQuery(_query: unknown): TicketQueryParseResult {
  return {
    value: {
      search: null,
      categoryId: null,
      relatedSystemId: null,
      requestedPriority: null,
      itPriority: null,
      status: null,
      sort: { field: 'createdAt', direction: 'desc' },
      page: 0,
      pageSize: 0,
    },
    errors: [],
  }
}
