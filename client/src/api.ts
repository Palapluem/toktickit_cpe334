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
