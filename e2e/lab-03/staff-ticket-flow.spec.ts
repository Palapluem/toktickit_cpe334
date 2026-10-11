// Parts 6–7 evidence: Queue, Ticket Detail, and their required E2E journey.
// Refused operations are exercised directly against the API as the wrong role.
import { expect, test } from '../lab-02/fixtures'
import {
  createTicket,
  DEVELOPMENT_PASSWORD,
  captureLab3Screenshot,
  signOut,
} from '../lab-02/helpers'

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

/** The version a status change must state (lab-04 BR-31), read from the Ticket the signed-in role may see. */
async function versionOf(
  page: import('@playwright/test').Page,
  path: string,
): Promise<number> {
  const response = await page.request.get(`${API}${path}`)
  expect(response.ok(), `reading ${path}`).toBeTruthy()
  return ((await response.json()) as { data: { version: number } }).data.version
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

test('QUEUE-01 · AC-34 captures the queue at three viewports', async ({ page }) => {
  await signIn(page, STAFF)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto('/staff/tickets')
    await expect(page.getByRole('heading', { name: 'Ticket Queue' })).toBeVisible()
    await expect(page.locator('tbody tr').first()).toBeVisible()

    if (viewport.name === 'tablet') {
      const updated = page.locator('.staff-queue__table td[data-label="Updated"]').first()
      await expect(updated).toBeVisible()
      const updatedBounds = await updated.boundingBox()
      expect(updatedBounds).not.toBeNull()
      expect(updatedBounds!.x + updatedBounds!.width).toBeLessThanOrEqual(viewport.width)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false)
    }

    await captureLab3Screenshot(
      page,
      'staff-queue',
      viewport.name === 'mobile' ? 'mobile-cards.png' : `${viewport.name}-list.png`,
    )
  }
})

test('QUEUE-02 shows ownership and the resolution marker', async ({ page }) => {
  await signIn(page, STAFF)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/staff/tickets')

  // Seeded: TKT-2026-900001 is unassigned, 900005 is WAITING_FOR_REQUESTER.
  await expect(
    page.locator('td[data-label="Owner"]').getByText('Unassigned').first(),
  ).toBeVisible()
  await page.getByRole('combobox', { name: 'Status' }).selectOption('WAITING_FOR_REQUESTER')
  await expect(page.getByText('Requester says resolved').first()).toBeVisible()
})

test('QUEUE-03 captures the no-results state', async ({ page }) => {
  await signIn(page, STAFF)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/staff/tickets')
  await expect(page.locator('tbody tr').first()).toBeVisible()

  await page
    .getByPlaceholder('Search by ticket number or summary…')
    .fill('nothing-matches-this-search')

  await expect(page.getByText('No tickets match these filters.')).toBeVisible()
  await captureLab3Screenshot(page, 'staff-queue', 'no-results.png')

  await page.getByRole('button', { name: 'Clear Filters' }).click()
  await expect(page.locator('tbody tr').first()).toBeVisible()
})

test('QUEUE-04 · fixture-backed UI evidence captures the true empty state', async ({ page }) => {
  await signIn(page, STAFF)
  await page.setViewportSize(VIEWPORTS[0])

  // This deterministic empty-response fixture differs from an applied filter:
  // the UI should show the true no-records state and not the no-results state.
  await page.route('**/api/staff/tickets**', async (route) => {
    const requestedSort = new URL(route.request().url()).searchParams.get('sort')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
        appliedFilters: {
          search: null,
          status: null,
          itPriority: null,
          categoryId: null,
          ownerId: null,
          sort: requestedSort ?? 'itPriority:desc',
        },
      }),
    })
  })

  await page.goto('/staff/tickets')

  await expect(page.getByText('No tickets in the queue.')).toBeVisible()
  await expect(page.getByText('No tickets match these filters.')).toHaveCount(0)
  await captureLab3Screenshot(page, 'staff-queue', 'empty.png')
})

test('QUEUE-05 refuses a Requester with the forbidden state', async ({ page }) => {
  await signIn(page, REQUESTER)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/staff/tickets')

  const refusal = page.getByRole('alert')
  await expect(refusal).toContainText('IT Staff and Administrators')
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  await captureLab3Screenshot(page, 'staff-queue', 'forbidden.png')

  const direct = await page.request.get(`${API}/api/staff/tickets`)
  expect(direct.status()).toBe(403)
})

test('QUEUE-07 · AC-19 preserves the live CANCELLED and Assigned to me filter check', async ({ page }) => {
  await signIn(page, STAFF)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/staff/tickets')
  await expect(page.locator('tbody tr').first()).toBeVisible()

  // The CANCELLED seed is unassigned; prove the status filter returns it before
  // combining with "me", then prove the owner filter has results on its own.
  await page.getByRole('combobox', { name: 'Status' }).selectOption('CANCELLED')
  await expect(page.getByRole('link', { name: 'TKT-2026-900009' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Owner' }).selectOption('me')

  await expect(page.getByText('No tickets match these filters.')).toBeVisible()
  await captureLab3Screenshot(page, 'staff-queue', 'filtered-cancelled-assigned.png')

  await page.getByRole('combobox', { name: 'Status' }).selectOption('')
  await expect(page.getByRole('link', { name: 'TKT-2026-900003' })).toBeVisible()
})

test('DETAIL-01 · AC-34 captures the staff Ticket Detail at three viewports', async ({ page }) => {
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

  await expect(
    page.locator('.staff-ticket__owner > p').filter({ hasText: 'Patricia Evans' }),
  ).toBeVisible()
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
    {
      data: {
        status: 'CLOSED',
        expectedVersion: await versionOf(page, `/api/staff/tickets/${ticketId}`),
      },
    },
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
    {
      data: {
        status: 'RESOLVED',
        expectedVersion: await versionOf(page, `/api/tickets/${ticketId}`),
      },
    },
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

test('DETAIL-07 carries an uploaded attachment into Staff Ticket Detail', async ({
  page,
  e2eSummaries,
}) => {
  const summary = `E2E staff attachment ${Date.now()}`
  e2eSummaries.add(summary)

  await signIn(page, REQUESTER)
  const created = await createTicket(page, summary, 'staff-detail-attachment.png')

  await signOut(page)
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, created.ticketNumber)
  await page.goto(`/staff/tickets/${ticketId}`)

  await expect(page.getByRole('heading', { name: created.ticketNumber })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Attachments' })).toContainText(
    'Attachments (1 of 5)',
  )
  await expect(
    page.getByRole('link', { name: 'Download staff-detail-attachment.png' }),
  ).toBeVisible()
  await captureLab3Screenshot(page, 'staff-ticket-detail', 'attachments.png')
})

test('DETAIL-08 reassigns a Ticket to another active owner', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, 'TKT-2026-900003')

  const owner = page.getByRole('combobox', { name: 'Owner' })
  await owner.selectOption({ label: 'Daniel Carter' })
  await expect(
    page.locator('.staff-ticket__owner > p').filter({ hasText: 'Daniel Carter' }),
  ).toBeVisible()

  const reassigned = await page.request.get(`${API}/api/staff/tickets/${ticketId}`)
  expect((await reassigned.json()).data.owner.displayName).toBe('Daniel Carter')

  // Restore the seeded owner so later evidence starts from the documented state.
  await owner.selectOption({ label: 'Patricia Evans' })
  await expect(
    page.locator('.staff-ticket__owner > p').filter({ hasText: 'Patricia Evans' }),
  ).toBeVisible()
  const restored = await page.request.get(`${API}/api/staff/tickets/${ticketId}`)
  expect((await restored.json()).data.owner.displayName).toBe('Patricia Evans')
})

test('DETAIL-09 shows a safe load failure and recovers with Try again', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openFirstQueueTicket(page, 'TKT-2026-900003')
  const detailRoute = `**/api/staff/tickets/${ticketId}`

  await page.route(detailRoute, (route) => route.abort())
  await page.goto(`/staff/tickets/${ticketId}`)
  await expect(page.getByRole('alert')).toContainText('ticket could not be loaded')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await captureLab3Screenshot(page, 'staff-ticket-detail', 'failure.png')

  await page.unroute(detailRoute)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'TKT-2026-900003' })).toBeVisible()
})

test('QUEUE-06 · fixture-backed UI evidence demonstrates 21-ticket pagination', async ({ page }) => {
  test.setTimeout(60_000)
  await signIn(page, STAFF)
  await page.setViewportSize(VIEWPORTS[0])

  await page.route('**/api/staff/tickets**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const requestedPage = Number(requestUrl.searchParams.get('page') ?? '1')
    const allRows = Array.from({ length: 21 }, (_, index) => ({
      id: `pagination-demo-${index + 1}`,
      ticketNo: `TKT-2026-${String(910001 + index).padStart(6, '0')}`,
      summary: `Pagination demonstration request ${index + 1}`,
      category: { id: 'category-demo', name: 'Hardware' },
      requester: { id: 'requester-demo', displayName: 'Jennifer Anderson' },
      requestedPriority: 'MEDIUM',
      itPriority: index < 5 ? 'HIGH' : 'MEDIUM',
      status: 'OPEN',
      owner: { id: 'staff-demo', displayName: 'Patricia Evans' },
      requesterResolvedAt: null,
      createdAt: '2026-09-15T08:00:00.000Z',
      updatedAt: '2026-09-15T09:00:00.000Z',
    }))
    const data = requestedPage === 2 ? allRows.slice(20) : allRows.slice(0, 20)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data,
        pagination: {
          page: requestedPage,
          pageSize: 20,
          totalItems: 21,
          totalPages: 2,
          hasPreviousPage: requestedPage > 1,
          hasNextPage: requestedPage < 2,
        },
        appliedFilters: {
          search: null,
          status: null,
          itPriority: null,
          categoryId: null,
          ownerId: null,
          sort: requestUrl.searchParams.get('sort') ?? 'itPriority:desc',
        },
      }),
    })
  })

  await page.goto('/staff/tickets')
  await expect(page.getByText('Page 1 of 2, 21 tickets')).toBeVisible()
  await expect(page.locator('.staff-queue__table tbody tr')).toHaveCount(20)
  await captureLab3Screenshot(page, 'staff-queue', 'pagination.png')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Page 2 of 2, 21 tickets')).toBeVisible()
  await expect(page.locator('.staff-queue__table tbody tr')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'TKT-2026-910021' })).toBeVisible()
  await captureLab3Screenshot(page, 'staff-queue', 'pagination-page-2.png')
})
