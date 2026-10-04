// Shared set-up for the Lab 4 journeys: seeded people, and a Ticket that is already being worked.
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_BASE_URL, DEVELOPMENT_PASSWORD, createTicket, signIn as signInRequester, signOut } from '../lab-02/helpers'

export const PEOPLE = {
  patricia: 'patricia.evans@example.ac.th',
  daniel: 'daniel.carter@example.ac.th',
  olivia: 'olivia.reed@example.ac.th',
  margaret: 'margaret.hale@example.ac.th',
  jennifer: 'jennifer.anderson@example.ac.th',
} as const

export async function login(request: APIRequestContext, email: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password: DEVELOPMENT_PASSWORD },
  })
  expect(response.ok(), `login for ${email}`).toBeTruthy()
}

type Detail = { version: number; assignableOwners: { id: string; displayName: string }[]; status: string }

export async function staffDetail(request: APIRequestContext, ticketId: string): Promise<Detail> {
  const response = await request.get(`${API_BASE_URL}/api/staff/tickets/${ticketId}`)
  expect(response.ok(), 'reading the staff detail').toBeTruthy()
  return ((await response.json()) as { data: Detail }).data
}

export async function userIdByName(request: APIRequestContext, ticketId: string, displayName: string): Promise<string> {
  const owner = (await staffDetail(request, ticketId)).assignableOwners.find((entry) => entry.displayName === displayName)
  expect(owner, `${displayName} is assignable`).toBeDefined()
  return owner!.id
}

export async function changeStatus(request: APIRequestContext, ticketId: string, status: string): Promise<void> {
  const { version } = await staffDetail(request, ticketId)
  const response = await request.patch(`${API_BASE_URL}/api/staff/tickets/${ticketId}/status`, {
    data: { status, expectedVersion: version },
  })
  expect(response.ok(), `moving to ${status}`).toBeTruthy()
}

/** An Action written through the API, for set-up that is not the thing under test. */
export async function addAction(
  request: APIRequestContext,
  ticketId: string,
  assigneeId: string,
  description: string,
  over: Record<string, unknown> = {},
): Promise<{ id: string; version: number }> {
  const response = await request.post(`${API_BASE_URL}/api/tickets/${ticketId}/actions`, {
    data: { requestId: crypto.randomUUID(), description, assigneeId, ...over },
  })
  expect(response.ok(), `adding "${description.slice(0, 30)}"`).toBeTruthy()
  return ((await response.json()) as { data: { id: string; version: number } }).data
}

/**
 * A Ticket the Requester Jennifer raised through the interface, claimed by Daniel and moved to IN_PROGRESS.
 * Every summary starts with "E2E " so the cleanup removes it, with its Actions and history.
 */
export async function workedTicket(
  page: Page,
  e2eSummaries: Set<string>,
  label: string,
): Promise<{ ticketId: string; ticketNumber: string; summary: string }> {
  const summary = `E2E ${label} ${Date.now()}`
  e2eSummaries.add(summary)
  await signInRequester(page, 'Jennifer Anderson')
  const { ticketId, ticketNumber } = await createTicket(page, summary)
  await signOut(page)

  await login(page.request, PEOPLE.daniel)
  const claim = await page.request.patch(`${API_BASE_URL}/api/staff/tickets/${ticketId}/owner`, { data: { ownerId: 'me' } })
  expect(claim.ok(), 'Daniel claims the Ticket').toBeTruthy()
  await changeStatus(page.request, ticketId, 'IN_PROGRESS')
  return { ticketId, ticketNumber, summary }
}
