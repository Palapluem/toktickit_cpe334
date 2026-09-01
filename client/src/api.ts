// Every endpoint returns { data: ... } (api-spec.md §1) and identifies rows by
// UUID (§11.1). The requester context travels in a header, never a body (§11.3).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export interface HealthResponse {
  status: string
  service: string
}

export interface Category {
  id: string
  name: string
}

export interface RelatedSystem {
  id: string
  name: string
}

export interface Requester {
  id: string
  displayName: string
  email: string
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED'

export interface TicketAttachment {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  removedAt: string | null
}

export interface Ticket {
  id: string
  ticketNo: string
  createdAt: string
  updatedAt: string
  summary: string
  description: string
  requestedPriority: Priority
  itPriority: Priority
  status: TicketStatus
  requester: Pick<Requester, 'id' | 'displayName'>
  category: Category
  relatedSystem: RelatedSystem
  owner: null
  attachments: TicketAttachment[]
  attachmentFailures: Array<{
    originalFilename: string
    reason: string
  }>
}

export type TicketListQuery = {
  search?: string
  categoryId?: string
  relatedSystemId?: string
  requestedPriority?: Priority
  itPriority?: Priority
  status?: TicketStatus
  sort?: string
  page?: number
  pageSize?: number
}

export interface TicketListItem {
  id: string
  ticketNo: string
  createdAt: string
  updatedAt: string
  summary: string
  requestedPriority: Priority
  itPriority: Priority
  status: TicketStatus
  owner: null
  category: Category
  relatedSystem: RelatedSystem
  activeAttachmentCount: number
}

export interface TicketListResponse {
  data: TicketListItem[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
  appliedFilters: {
    search: string | null
    categoryId: string | null
    relatedSystemId: string | null
    requestedPriority: Priority | null
    itPriority: Priority | null
    status: TicketStatus | null
    sort: string
  }
}

export type CreateTicketPayload = {
  categoryId: string
  relatedSystemId: string
  summary: string
  description: string
  requestedPriority: Priority
  attachments?: File[]
}

export class ApiRequestError extends Error {
  readonly fieldErrors: Array<{ field: string; message: string }>

  constructor(
    message: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
  ) {
    super(message)
    this.fieldErrors = fieldErrors
    this.name = 'ApiRequestError'
  }
}

async function get<T>(
  path: string,
  label: string,
  requesterId?: string,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (requesterId) headers['X-Requester-Id'] = requesterId

  const response = await fetch(`${API_BASE_URL}${path}`, { headers })

  if (!response.ok) {
    // The status is deliberately not surfaced to the caller's message: screens
    // show a safe sentence, not a transport detail (TC-008).
    throw new Error(`${label} request failed`)
  }

  const body = await response.json()
  return body.data as T
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`)

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return response.json()
}

export function fetchCategories(requesterId?: string): Promise<Category[]> {
  return get<Category[]>('/api/categories', 'Categories', requesterId)
}

export function fetchRelatedSystems(
  requesterId?: string,
): Promise<RelatedSystem[]> {
  return get<RelatedSystem[]>(
    '/api/related-systems',
    'Related systems',
    requesterId,
  )
}

export function fetchRequesters(): Promise<Requester[]> {
  return get<Requester[]>('/api/requesters', 'Requesters')
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId: string,
): Promise<Ticket> {
  const headers: Record<string, string> = {
    'X-Requester-Id': requesterId,
  }
  let requestBody: BodyInit

  if (payload.attachments?.length) {
    const form = new FormData()
    form.append('categoryId', payload.categoryId)
    form.append('relatedSystemId', payload.relatedSystemId)
    form.append('summary', payload.summary)
    form.append('description', payload.description)
    form.append('requestedPriority', payload.requestedPriority)
    for (const file of payload.attachments) form.append('attachments', file)
    requestBody = form
  } else {
    headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify({
      categoryId: payload.categoryId,
      relatedSystemId: payload.relatedSystemId,
      summary: payload.summary,
      description: payload.description,
      requestedPriority: payload.requestedPriority,
    })
  }

  const response = await fetch(`${API_BASE_URL}/api/tickets`, {
    method: 'POST',
    headers,
    body: requestBody,
  })

  if (!response.ok) {
    let fieldErrors: Array<{ field: string; message: string }> = []
    try {
      const errorBody = (await response.json()) as {
        error?: { fieldErrors?: Array<{ field: string; message: string }> }
      }
      fieldErrors = errorBody.error?.fieldErrors ?? []
    } catch {
      // The UI still has a safe fallback when a failed service returns no JSON.
    }
    throw new ApiRequestError('Could not create the ticket.', fieldErrors)
  }

  const responseBody = (await response.json()) as { data: Ticket }
  return responseBody.data
}

export async function fetchTickets(
  requesterId: string,
  query: TicketListQuery = {},
): Promise<TicketListResponse> {
  const params = new URLSearchParams()
  const add = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === '') return
    params.set(key, String(value))
  }

  add('search', query.search?.trim())
  add('categoryId', query.categoryId)
  add('relatedSystemId', query.relatedSystemId)
  add('requestedPriority', query.requestedPriority)
  add('itPriority', query.itPriority)
  add('status', query.status)
  add('sort', query.sort)
  add('page', query.page)
  add('pageSize', query.pageSize)

  const queryString = params.toString()
  const response = await fetch(
    `${API_BASE_URL}/api/tickets${queryString ? `?${queryString}` : ''}`,
    { headers: { 'X-Requester-Id': requesterId } },
  )

  if (!response.ok) {
    throw new Error('Tickets request failed')
  }

  return (await response.json()) as TicketListResponse
}
