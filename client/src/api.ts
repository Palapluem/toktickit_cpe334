// Every endpoint returns { data: ... } (api-spec.md §1) and identifies rows by
// UUID (lab-02 §11.1). Identity travels in the session cookie, which is why every
// request sets credentials: 'include' — nothing here names a user (BR-10).
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

export type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'

/** The safe profile /api/auth/me returns. Never carries a hash or a token (SEC-003). */
export interface SessionUser {
  id: string
  displayName: string
  email: string
  role: Role
  mustChangePassword: boolean
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
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
  /** The Requester's "appears resolved" signal — a timestamp, not a status (§11.7). */
  requesterResolvedAt: string | null
  requester: Pick<Requester, 'id' | 'displayName'>
  category: Category
  relatedSystem: RelatedSystem
  owner: null
  attachments: TicketAttachment[]
}

export type AttachmentFailure = {
  originalFilename: string
  reason: string
}

export type CreatedTicket = Ticket & {
  attachmentFailures: AttachmentFailure[]
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

async function get<T>(path: string, label: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
  })

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

export function fetchCategories(): Promise<Category[]> {
  return get<Category[]>('/api/categories', 'Categories')
}

export function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  return get<RelatedSystem[]>('/api/related-systems', 'Related systems')
}

/** The authenticated user. How the client learns its role — never from storage (SEC-005). */
export function fetchCurrentUser(): Promise<SessionUser> {
  return get<SessionUser>('/api/auth/me', 'Current user')
}

async function postJson<T>(
  path: string,
  body: unknown,
  label: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    await throwApiRequestError(response, label)
  }

  return ((await response.json()) as { data: T }).data
}

/** The session cookie arrives in the response; nothing about it is readable here. */
export function login(email: string, password: string): Promise<SessionUser> {
  return postJson<SessionUser>('/api/auth/login', { email, password }, 'Sign in failed')
}

export function logout(): Promise<{ loggedOut: boolean }> {
  return postJson<{ loggedOut: boolean }>('/api/auth/logout', {}, 'Sign out failed')
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ passwordChanged: boolean }> {
  return postJson<{ passwordChanged: boolean }>(
    '/api/auth/change-password',
    { currentPassword, newPassword },
    'Password change failed',
  )
}

export async function createTicket(
  payload: CreateTicketPayload,
): Promise<CreatedTicket> {
  const headers: Record<string, string> = {}
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
    credentials: 'include',
    headers,
    body: requestBody,
  })

  if (!response.ok) {
    await throwApiRequestError(response, 'Could not create the ticket.')
  }

  const responseBody = (await response.json()) as { data: CreatedTicket }
  return responseBody.data
}

export interface StaffQueueRow {
  id: string
  ticketNo: string
  summary: string
  category: Category
  requester: Pick<Requester, 'id' | 'displayName'>
  requestedPriority: Priority
  itPriority: Priority
  status: TicketStatus
  owner: Pick<Requester, 'id' | 'displayName'> | null
  requesterResolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StaffQueueQuery {
  search?: string
  status?: string
  itPriority?: string
  categoryId?: string
  ownerId?: string
  sort?: string
  page?: number
  pageSize?: number
}

export interface StaffQueueResponse {
  data: StaffQueueRow[]
  pagination: TicketListResponse['pagination']
  appliedFilters: {
    search: string | null
    status: string | null
    itPriority: string | null
    categoryId: string | null
    ownerId: string | null
    sort: string
  }
}

export async function fetchStaffQueue(
  query: StaffQueueQuery = {},
): Promise<StaffQueueResponse> {
  const params = new URLSearchParams()
  for (const [key, raw] of Object.entries(query)) {
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (value === undefined || value === '' || value === null) continue
    params.set(key, String(value))
  }

  const queryString = params.toString()
  const response = await fetch(
    `${API_BASE_URL}/api/staff/tickets${queryString ? `?${queryString}` : ''}`,
    { credentials: 'include' },
  )

  if (!response.ok) {
    await throwApiRequestError(response, 'Queue request failed')
  }

  return (await response.json()) as StaffQueueResponse
}

export interface StaffTicket extends Omit<StaffQueueRow, 'category'> {
  description: string
  category: Category
  relatedSystem: RelatedSystem
  attachments: TicketAttachment[]
  permittedTransitions: TicketStatus[]
}

async function patchJson<T>(path: string, body: unknown, label: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    await throwApiRequestError(response, label)
  }

  return ((await response.json()) as { data: T }).data
}

export function fetchStaffTicket(ticketId: string): Promise<StaffTicket> {
  return get<StaffTicket>(`/api/staff/tickets/${ticketId}`, 'Ticket request failed')
}

/** `me` is the claim; null unassigns (api-spec.md §8). */
export function setTicketOwner(
  ticketId: string,
  ownerId: string | null,
): Promise<StaffTicket> {
  return patchJson<StaffTicket>(
    `/api/staff/tickets/${ticketId}/owner`,
    { ownerId },
    'Could not change the owner.',
  )
}

export function setItPriority(
  ticketId: string,
  itPriority: Priority,
): Promise<StaffTicket> {
  return patchJson<StaffTicket>(
    `/api/staff/tickets/${ticketId}/it-priority`,
    { itPriority },
    'Could not change the IT priority.',
  )
}

export function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<StaffTicket> {
  return patchJson<StaffTicket>(
    `/api/staff/tickets/${ticketId}/status`,
    { status },
    'Could not change the status.',
  )
}

/** The Requester's signal. A timestamp, never a status (§11.7). */
export function indicateRequesterResolution(
  ticketId: string,
): Promise<{ requesterResolvedAt: string; status: TicketStatus }> {
  return postJson<{ requesterResolvedAt: string; status: TicketStatus }>(
    `/api/tickets/${ticketId}/requester-resolution`,
    {},
    'Could not record that the problem appears resolved.',
  )
}

export interface ThreadEntry {
  id: string
  body: string
  createdAt: string
  author: { id: string; displayName: string; role: Role }
}

export const MAX_ENTRY_LENGTH = 2000

export function fetchComments(ticketId: string): Promise<ThreadEntry[]> {
  return get<ThreadEntry[]>(`/api/tickets/${ticketId}/comments`, 'Comments request failed')
}

export function postComment(ticketId: string, body: string): Promise<ThreadEntry> {
  return postJson<ThreadEntry>(
    `/api/tickets/${ticketId}/comments`,
    { body },
    'The comment could not be posted.',
  )
}

export function fetchInternalNotes(ticketId: string): Promise<ThreadEntry[]> {
  return get<ThreadEntry[]>(
    `/api/tickets/${ticketId}/internal-notes`,
    'Internal notes request failed',
  )
}

export function postInternalNote(ticketId: string, body: string): Promise<ThreadEntry> {
  return postJson<ThreadEntry>(
    `/api/tickets/${ticketId}/internal-notes`,
    { body },
    'The note could not be added.',
  )
}

export async function fetchTickets(
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
    { credentials: 'include' },
  )

  if (!response.ok) {
    throw new Error('Tickets request failed')
  }

  return (await response.json()) as TicketListResponse
}

export async function fetchTicket(ticketId: string): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    await throwApiRequestError(response, 'Ticket request failed')
  }
  return ((await response.json()) as { data: Ticket }).data
}

export async function uploadAttachment(
  ticketId: string,
  file: File,
): Promise<AttachmentMutationResponse> {
  const form = new FormData()
  form.append('attachment', file)
  const response = await fetch(
    `${API_BASE_URL}/api/tickets/${ticketId}/attachments`,
    {
      method: 'POST',
      credentials: 'include',
      body: form,
    },
  )
  if (!response.ok) {
    await throwApiRequestError(response, 'Attachment upload failed')
  }
  return (await response.json()) as AttachmentMutationResponse
}

export async function removeAttachment(
  attachmentId: string,
  reason: string,
): Promise<AttachmentMutationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/attachments/${attachmentId}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  )
  if (!response.ok) {
    await throwApiRequestError(response, 'Attachment removal failed')
  }
  return (await response.json()) as AttachmentMutationResponse
}

export async function downloadAttachment(attachmentId: string): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/attachments/${attachmentId}/download`,
    { credentials: 'include' },
  )
  if (!response.ok) {
    await throwApiRequestError(response, 'Attachment download failed')
  }
  return response.blob()
}
