// Part 6 evidence for Issue #50. Empty and no-results are captured explicitly
// because a queue with data in it will not produce either.
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

test('QUEUE-01 captures the queue at three viewports', async ({ page }) => {
  await signIn(page, STAFF)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto('/staff/tickets')
    await expect(page.getByRole('heading', { name: 'Ticket Queue' })).toBeVisible()
    await expect(page.locator('tbody tr').first()).toBeVisible()

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

  // Seeded: TKT-2026-900001 is unassigned, 900005 is WAITING_FOR_REQUESTER
  // with the Requester's resolution signal set.
  // Scoped to the Owner cells: "Unassigned" is also an option in the filter.
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

test('QUEUE-04 captures the empty state', async ({ page }) => {
  await signIn(page, STAFF)
  await page.setViewportSize(VIEWPORTS[0])

  // CANCELLED has exactly one seeded Ticket; removing the owner filter is not
  // enough to empty the queue, so the empty state needs a filter that is
  // genuinely satisfied by nothing — assigned-to-me among cancelled work.
  await page.goto('/staff/tickets')
  await page.getByRole('combobox', { name: 'Status' }).selectOption('CANCELLED')
  await page.getByRole('combobox', { name: 'Owner' }).selectOption('me')

  await expect(page.getByText('No tickets match these filters.')).toBeVisible()
  await captureLab3Screenshot(page, 'staff-queue', 'empty.png')
})

test('QUEUE-05 refuses a Requester with the forbidden state', async ({ page }) => {
  await signIn(page, REQUESTER)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/staff/tickets')

  const refusal = page.getByRole('alert')
  await expect(refusal).toContainText('IT Staff and Administrators')
  // Forbidden never offers Try again (ui-spec §4).
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0)
  await captureLab3Screenshot(page, 'staff-queue', 'forbidden.png')

  // The screen's state comes from the server's refusal, which is the control.
  const direct = await page.request.get(`${API}/api/staff/tickets`)
  expect(direct.status()).toBe(403)
})
