// E2E-02, E2E-03 (status half) · lab-04 AC-15 to AC-23: the resolution gate, the cancellation cascade, the history and
// a stale status change. Actions are set up through the API here; the Actions screen has its own journey.
import { test, expect } from '../lab-02/fixtures'
import { API_BASE_URL, captureLab4Screenshot, signOut } from '../lab-02/helpers'
import { PEOPLE, addAction, changeStatus, login, userIdByName, workedTicket } from './support'

const statusSelect = (page: import('@playwright/test').Page) => page.getByRole('combobox', { name: 'Status' })
const offered = async (page: import('@playwright/test').Page) =>
  (await statusSelect(page).locator('option').evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value))).filter(Boolean)

test('E2E-02 · AC-15 to AC-18, AC-21 to AC-23 · resolving is blocked by open work, then allowed, and it is all in the history', async ({
  page,
  e2eSummaries,
}) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'resolution gate')
  const olivia = await userIdByName(page.request, ticketId, 'Olivia Reed')
  const first = await addAction(page.request, ticketId, olivia, 'Collect the relay error from the mail gateway log.')
  const second = await addAction(page.request, ticketId, olivia, 'Restore the allow-list.')

  // The control does not offer RESOLVED, and says why; the server refuses it too, if asked directly (AC-15, AC-18).
  await page.goto(`/staff/tickets/${ticketId}`)
  await expect(statusSelect(page)).toBeVisible()
  expect(await offered(page)).not.toContain('RESOLVED')
  await expect(page.getByText('Resolved becomes available when the 2 open Actions are completed or cancelled.')).toBeVisible()
  await captureLab4Screenshot(page, 'ticket-workflow', 'resolve-blocked.png')
  const direct = await page.request.patch(`${API_BASE_URL}/api/staff/tickets/${ticketId}/status`, {
    data: { status: 'RESOLVED', expectedVersion: 3 },
  })
  expect(direct.status()).toBe(409)
  expect((await direct.json()).error).toMatchObject({ code: 'OPEN_ACTIONS_BLOCK_RESOLUTION', details: { openActionCount: 2 } })

  // The work is finished; the Ticket can be resolved (AC-16, AC-21).
  for (const action of [first, second]) {
    const started = await page.request.patch(`${API_BASE_URL}/api/tickets/${ticketId}/actions/${action.id}/status`, {
      data: { expectedVersion: action.version, status: 'IN_PROGRESS' },
    })
    expect(started.ok()).toBeTruthy()
    const done = await page.request.patch(`${API_BASE_URL}/api/tickets/${ticketId}/actions/${action.id}/status`, {
      data: { expectedVersion: action.version + 1, status: 'COMPLETED', result: 'Done.' },
    })
    expect(done.ok()).toBeTruthy()
  }
  await page.reload()
  await expect(statusSelect(page)).toBeEnabled()
  await expect.poll(() => offered(page)).toContain('RESOLVED')
  await statusSelect(page).selectOption('RESOLVED')
  await expect(page.getByText('Status changed to Resolved.')).toBeVisible()
  await expect(page.locator('.zen-badge--status', { hasText: 'RESOLVED' }).first()).toBeVisible()
  expect(await offered(page)).toEqual(['CLOSED', 'REOPENED'])
  await captureLab4Screenshot(page, 'ticket-workflow', 'resolved-after-work-complete.png')

  // The history lists each change once, in order (AC-22).
  const history = page.getByRole('region', { name: 'History' })
  await expect(history.getByRole('listitem')).toHaveCount(10)
  await expect(history.getByRole('listitem').last()).toContainText('Status changed from In progress to Resolved')
  await history.scrollIntoViewIfNeeded()
  await captureLab4Screenshot(page, 'ticket-workflow', 'history-staff.png')

  // The Requester sees the status changes only (AC-23).
  await signOut(page)
  await login(page.request, PEOPLE.jennifer)
  await page.goto(`/tickets/${ticketId}`)
  const own = page.getByRole('region', { name: 'History' })
  // Claimed (New to Open), started (Open to In progress), resolved: three status changes out of ten events.
  await expect(own.getByRole('listitem')).toHaveCount(3)
  await expect(own).toContainText('Status changed from New to Open')
  await expect(own).toContainText('Status changed from In progress to Resolved')
  await expect(own).not.toContainText('Action')
  await own.scrollIntoViewIfNeeded()
  await captureLab4Screenshot(page, 'ticket-workflow', 'history-requester.png')
})

test('E2E-02 · AC-17 · cancelling a Ticket asks first and cancels its open Actions with it', async ({ page, e2eSummaries }) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'cancel cascade')
  const olivia = await userIdByName(page.request, ticketId, 'Olivia Reed')
  await addAction(page.request, ticketId, olivia, 'First open Action.')
  await addAction(page.request, ticketId, olivia, 'Second open Action.')

  await page.goto(`/staff/tickets/${ticketId}`)
  await statusSelect(page).selectOption('CANCELLED')
  await expect(page.getByText('Cancel this Ticket? 2 open Actions will also be cancelled.')).toBeVisible()
  await captureLab4Screenshot(page, 'ticket-workflow', 'cancel-cascade.png')
  await page.getByRole('button', { name: 'Cancel Ticket' }).click()

  await expect(page.getByText('Status changed to Cancelled.')).toBeVisible()
  const history = page.getByRole('region', { name: 'History' })
  await expect(history).toContainText('2 open Actions were cancelled.')
  await expect(history).toContainText('Action cancelled because the Ticket was cancelled')
  const actions = await page.request.get(`${API_BASE_URL}/api/tickets/${ticketId}/actions`)
  const rows = (await actions.json()).data as { status: string; cancellationReason: string }[]
  expect(rows.map((row) => row.status)).toEqual(['CANCELLED', 'CANCELLED'])
  expect(rows.every((row) => row.cancellationReason === 'Ticket cancelled')).toBe(true)
})

test('E2E-03 · AC-19 · AC-21 · a stale status change is refused, the latest status is shown, and a retry succeeds', async ({
  page,
  browser,
  e2eSummaries,
}) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'stale status')
  await login(page.request, PEOPLE.patricia)
  await page.goto(`/staff/tickets/${ticketId}`)
  await expect(statusSelect(page)).toBeEnabled()

  // A second person moves the Ticket while this page is open.
  const other = await browser.newContext()
  try {
    await login(other.request, PEOPLE.margaret)
    await changeStatus(other.request, ticketId, 'WAITING_FOR_REQUESTER')
  } finally {
    await other.close()
  }

  await statusSelect(page).selectOption('RESOLVED')
  await expect(page.getByRole('alert')).toContainText('This Ticket changed since you opened it. The latest status is shown — review and try again.')
  await expect(page.locator('.zen-badge--status', { hasText: 'WAITING_FOR_REQUESTER' }).first()).toBeVisible()
  await captureLab4Screenshot(page, 'ticket-workflow', 'stale-status.png')

  await statusSelect(page).selectOption('RESOLVED')
  await expect(page.getByText('Status changed to Resolved.')).toBeVisible()
})
