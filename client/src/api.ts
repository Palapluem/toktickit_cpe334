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
  removedReason?: string | null
  isDownloadable?: boolean
  uploadedBy?: Pick<Requester, 'id' | 'displayName'>
  removedBy?: Pick<Requester, 'id' | 'displayName'> | null
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
  readonly status?: number
  readonly code?: string

  constructor(
    message: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
    status?: number,
    code?: string,
  ) {
    super(message)
    this.fieldErrors = fieldErrors
    this.status = status
    this.code = code
    this.name = 'ApiRequestError'
  }
}

export type AttachmentMutationResponse = {
  data: TicketAttachment
  activeCount: number
  activeLimit: number
}

async function throwApiRequestError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  let message = fallbackMessage
  let fieldErrors: Array<{ field: string; message: string }> = []
  let code: string | undefined
  try {
    const body = (await response.json()) as {
      error?: {
        code?: string
        message?: string
        fieldErrors?: Array<{ field: string; message: string }>
      }
    }
    message = body.error?.message ?? message
    fieldErrors = body.error?.fieldErrors ?? []
    code = body.error?.code
  } catch {
    // Keep the screen-level message safe when a failed service returns no JSON.
  }
  throw new ApiRequestError(message, fieldErrors, response.status, code)
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
    await throwApiRequestError(response, `${label} request failed`)
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
    await throwApiRequestError(response, 'Could not create the ticket.')
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

export async function fetchTicket(
  requesterId: string,
  ticketId: string,
): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
    headers: { 'X-Requester-Id': requesterId },
  })
  if (!response.ok) {
    await throwApiRequestError(response, 'Ticket request failed')
  }
  return ((await response.json()) as { data: Ticket }).data
}

export async function uploadAttachment(
  requesterId: string,
  ticketId: string,
  file: File,
): Promise<AttachmentMutationResponse> {
  const form = new FormData()
  form.append('attachment', file)
  const response = await fetch(
    `${API_BASE_URL}/api/tickets/${ticketId}/attachments`,
    {
      method: 'POST',
      headers: { 'X-Requester-Id': requesterId },
      body: form,
    },
  )
  if (!response.ok) {
    await throwApiRequestError(response, 'Attachment upload failed')
  }
  return (await response.json()) as AttachmentMutationResponse
}

export async function removeAttachment(
  requesterId: string,
  attachmentId: string,
  reason: string,
): Promise<AttachmentMutationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/attachments/${attachmentId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Requester-Id': requesterId,
      },
      body: JSON.stringify({ reason }),
    },
  )
  if (!response.ok) {
    await throwApiRequestError(response, 'Attachment removal failed')
  }
  return (await response.json()) as AttachmentMutationResponse
}

export async function downloadAttachment(
  requesterId: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/attachments/${attachmentId}/download`,
    { headers: { 'X-Requester-Id': requesterId } },
  )
  if (!response.ok) {
    await throwApiRequestError(response, 'Attachment download failed')
  }
  return response.blob()
}
