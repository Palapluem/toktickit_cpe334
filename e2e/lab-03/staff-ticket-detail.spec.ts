// Part 7 evidence for Issue #51. Three viewports plus a refused action.
//
// The status control only ever offers permitted transitions, so a refusal
// cannot be produced through it — which is the point. The refusals are made
// directly against the API, as the wrong role and with an impossible move,
// and the one refusal a user can actually see is captured.
import { expect, test } from '../lab-02/fixtures'
import { DEVELOPMENT_PASSWORD, captureLab3Screenshot } from '../lab-02/helpers'

const API = 'http://127.0.0.1:3002'

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const

const STAFF = 'patricia.evans@example.ac.th'
const REQUESTER = 'jennifer.anderson@example.ac.th'

async function signIn(
  page: import('@playwright/test').Page,
  email: string,
): Promise<void> {
  const login = await page.request.post(`${API}/api/auth/login`, {
    data: { email, password: DEVELOPMENT_PASSWORD },
  })
  expect(login.ok(), `login for ${email}`).toBeTruthy()
}

/** The seeded unassigned NEW Ticket, found through the queue. */
async function openFirstQueueTicket(
  page: import('@playwright/test').Page,
  ticketNo: string,
): Promise<string> {
  // Searched rather than scrolled: the Ticket may not be on the first page.
  await page.goto('/staff/tickets')
  await page.getByPlaceholder('Search by ticket number or summary…').fill(ticketNo)
  const link = page.getByRole('link', { name: ticketNo })
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  expect(href, `href for ${ticketNo}`).toBeTruthy()
  await page.goto(href!)
  return href!.split('/').pop()!
}

test('DETAIL-01 captures the staff Ticket Detail at three viewports', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, 'TKT-2026-900003')

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto(`/staff/tickets/${ticketId}`)
    await expect(page.getByRole('heading', { name: 'TKT-2026-900003' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible()
    await captureLab3Screenshot(
      page,
      'staff-ticket-detail',
      `${viewport.name}-detail.png`,
    )
  }
})

test('DETAIL-02 claims an unassigned Ticket and moves it to OPEN', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, 'TKT-2026-900001')

  await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible()
  await page.getByRole('button', { name: 'Claim' }).click()

  await expect(page.getByText('Patricia Evans')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unassign' })).toBeVisible()

  // BR-24: claiming a NEW Ticket moves it to OPEN in the same operation.
  const detail = await page.request.get(`${API}/api/staff/tickets/${ticketId}`)
  expect((await detail.json()).data.status).toBe('OPEN')

  await page.getByRole('button', { name: 'Unassign' }).click()
  await expect(page.getByRole('button', { name: 'Claim' })).toBeVisible()
})

test('DETAIL-03 offers only permitted transitions', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, 'TKT-2026-900009')

  // A CANCELLED Ticket is terminal for everyone (BR-25).
  const control = page.getByRole('combobox', { name: 'Status' })
  await expect(control).toBeDisabled()

  const detail = await page.request.get(`${API}/api/staff/tickets/${ticketId}`)
  expect((await detail.json()).data.permittedTransitions).toEqual([])
})

test('DETAIL-04 refuses the moves nobody and no role may make', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, 'TKT-2026-900001')

  // Impossible for any role: 400.
  const impossible = await page.request.patch(
    `${API}/api/staff/tickets/${ticketId}/status`,
    { data: { status: 'CLOSED' } },
  )
  expect(impossible.status()).toBe(400)
  expect((await impossible.json()).error.code).toBe('INVALID_STATUS_TRANSITION')

  // Requested Priority is never altered, by anyone (BR-18).
  const priority = await page.request.patch(
    `${API}/api/staff/tickets/${ticketId}/it-priority`,
    { data: { itPriority: 'URGENT', requestedPriority: 'LOW' } },
  )
  expect(priority.status()).toBe(400)
})

test('DETAIL-05 captures the refusal a Requester can actually see', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, 'TKT-2026-900001')

  await page.request.post(`${API}/api/auth/logout`)
  await signIn(page, REQUESTER)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto(`/staff/tickets/${ticketId}`)

  const refusal = page.getByRole('alert')
  await expect(refusal).toContainText('IT Staff and Administrators')
  await captureLab3Screenshot(page, 'staff-ticket-detail', 'forbidden.png')

  // AC-24: and the same Requester cannot declare it solved by any route.
  const resolved = await page.request.patch(
    `${API}/api/staff/tickets/${ticketId}/status`,
    { data: { status: 'RESOLVED' } },
  )
  expect(resolved.status()).toBe(403)
})

test('DETAIL-06 lets the Requester say the problem appears resolved', async ({ page }) => {
  await signIn(page, REQUESTER)
  await page.goto('/tickets')

  const link = page.getByRole('link', { name: 'TKT-2026-900005' })
  await expect(link).toBeVisible()
  await link.click()

  // Seeded with the signal already set, so the report shows rather than the action.
  await expect(page.getByText(/you reported this as appearing resolved/i)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'The problem appears resolved' }),
  ).toHaveCount(0)
})
