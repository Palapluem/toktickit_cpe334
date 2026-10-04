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

export type AssignableOwner = Pick<Requester, 'id' | 'displayName'>

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
  /** Safe-to-display facts about a refused state, such as the open-Action count (lab-04 api-spec §1). */
  readonly details?: Record<string, unknown>

  constructor(
    message: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
    status?: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.fieldErrors = fieldErrors
    this.status = status
    this.code = code
    this.details = details
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
  let details: Record<string, unknown> | undefined
  try {
    const body = (await response.json()) as {
      error?: {
        code?: string
        message?: string
        fieldErrors?: Array<{ field: string; message: string }>
        details?: Record<string, unknown>
      }
    }
    message = body.error?.message ?? message
    fieldErrors = body.error?.fieldErrors ?? []
    code = body.error?.code
    details = body.error?.details
  } catch {
    // Keep the screen-level message safe when a failed service returns no JSON.
  }
  throw new ApiRequestError(message, fieldErrors, response.status, code, details)
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

/** A move held back while work is open, with the reason the interface explains (lab-04 AC-18). */
export interface BlockedTransition {
  status: 'RESOLVED' | 'CLOSED'
  reason: 'OPEN_ACTIONS'
  openActionCount: number
}

export interface StaffTicket extends Omit<StaffQueueRow, 'category'> {
  description: string
  category: Category
  relatedSystem: RelatedSystem
  /** The version a status change must state (lab-04 BR-31). */
  version: number
  openActionCount: number
  attachments: TicketAttachment[]
  assignableOwners: AssignableOwner[]
  permittedTransitions: TicketStatus[]
  blockedTransitions: BlockedTransition[]
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

/** What a successful status change returns; the screen reloads the Ticket for the rest (lab-04 api-spec §4). */
export interface StatusChange {
  id: string
  status: TicketStatus
  version: number
  updatedAt: string
  permittedTransitions: TicketStatus[]
  cancelledActionCount: number
}

export function setTicketStatus(
  ticketId: string,
  status: TicketStatus,
  expectedVersion: number,
): Promise<StatusChange> {
  return patchJson<StatusChange>(
    `/api/staff/tickets/${ticketId}/status`,
    { status, expectedVersion },
    'Could not change the status.',
  )
}

export type TicketEventType =
  | 'STATUS_CHANGED'
  | 'OWNER_CHANGED'
  | 'IT_PRIORITY_CHANGED'
  | 'ACTION_CREATED'
  | 'ACTION_UPDATED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_STARTED'
  | 'ACTION_COMPLETED'
  | 'ACTION_CANCELLED'

/** One line of history. `details` holds statuses, priorities, field names and display names only (BR-30). */
export interface TicketEvent {
  id: string
  type: TicketEventType
  actor: { displayName: string }
  createdAt: string
  details: Record<string, unknown>
}

export function fetchTicketHistory(ticketId: string): Promise<TicketEvent[]> {
  return get<TicketEvent[]>(`/api/tickets/${ticketId}/history`, 'History')
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

export interface ManagedUser {
  id: string
  displayName: string
  email: string
  role: Role
  isActive: boolean
  mustChangePassword: boolean
}

export interface UserQuery {
  search?: string
  role?: string
}

export function fetchUsers(query: UserQuery = {}): Promise<ManagedUser[]> {
  const params = new URLSearchParams()
  for (const [key, raw] of Object.entries(query)) {
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (!value) continue
    params.set(key, String(value))
  }
  const queryString = params.toString()
  return get<ManagedUser[]>(
    `/api/admin/users${queryString ? `?${queryString}` : ''}`,
    'Users request failed',
  )
}

export type NewUser = {
  displayName: string
  email: string
  role: Role
  isActive: boolean
  initialPassword: string
}

export function createUser(payload: NewUser): Promise<ManagedUser> {
  return postJson<ManagedUser>('/api/admin/users', payload, 'The user could not be created.')
}

export type UserChanges = Partial<
  Pick<ManagedUser, 'displayName' | 'email' | 'role' | 'isActive'>
>

export function updateUser(userId: string, changes: UserChanges): Promise<ManagedUser> {
  return patchJson<ManagedUser>(
    `/api/admin/users/${userId}`,
    changes,
    'The user could not be saved.',
  )
}

/** The password is never echoed back, so neither is it returned here (SEC-032). */
export function setUserInitialPassword(
  userId: string,
  initialPassword: string,
): Promise<{ id: string; mustChangePassword: boolean }> {
  return postJson<{ id: string; mustChangePassword: boolean }>(
    `/api/admin/users/${userId}/initial-password`,
    { initialPassword },
    'The initial password could not be set.',
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

// ---- Actions Taken (lab-04 api-spec §2, §3) ----

export type ActionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

/** Staff get identifiers and activity; a Requester gets the display name only (BR-17). */
export interface ActionPerson {
  id?: string
  displayName: string
  isActive?: boolean
}

export interface ActionTaken {
  id: string
  ticketId: string
  status: ActionStatus
  description: string
  result: string | null
  followUpRequired: boolean
  followUpNote: string | null
  attachmentNotes: string | null
  assignee: ActionPerson
  performedBy: ActionPerson | null
  actionAt: string
  completedBy: ActionPerson | null
  completedAt: string | null
  cancelledBy: ActionPerson | null
  cancelledAt: string | null
  cancellationReason: string | null
  version: number
  updatedAt: string
}

export interface NewAction {
  requestId: string
  description: string
  assigneeId: string
  followUpRequired: boolean
  followUpNote: string | null
  attachmentNotes: string | null
}

export interface ActionEdit {
  expectedVersion: number
  description?: string
  result?: string | null
  followUpRequired?: boolean
  followUpNote?: string | null
  attachmentNotes?: string | null
  assigneeId?: string
}

export type ActionMove =
  | { expectedVersion: number; status: 'IN_PROGRESS' }
  | { expectedVersion: number; status: 'COMPLETED'; result?: string }
  | { expectedVersion: number; status: 'CANCELLED'; cancellationReason: string }

export function fetchActions(ticketId: string): Promise<ActionTaken[]> {
  return get<ActionTaken[]>(`/api/tickets/${ticketId}/actions`, 'Actions')
}

/** A repeated `requestId` returns the Action already created (BR-34). */
export function createAction(ticketId: string, body: NewAction): Promise<ActionTaken> {
  return postJson<ActionTaken>(`/api/tickets/${ticketId}/actions`, body, 'Could not save the Action.')
}

export function updateAction(ticketId: string, actionId: string, body: ActionEdit): Promise<ActionTaken> {
  return patchJson<ActionTaken>(`/api/tickets/${ticketId}/actions/${actionId}`, body, 'Could not save the Action.')
}

export function moveAction(ticketId: string, actionId: string, body: ActionMove): Promise<ActionTaken> {
  return patchJson<ActionTaken>(`/api/tickets/${ticketId}/actions/${actionId}/status`, body, 'Could not change the Action.')
}
