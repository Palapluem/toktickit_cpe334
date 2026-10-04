// E2E-07, E2E-08, E2E-09, A11Y-02 · lab-04 AC-13, AC-14, AC-35, AC-36, BR-23; api-spec §1; ui-spec §9 — what the Actions screen
// does when things go wrong: a lost response, a Ticket that stops taking Actions, a busy dialog, and a device in another zone.
import { test, expect } from '../lab-02/fixtures'
import { API_BASE_URL } from '../lab-02/helpers'
import { PEOPLE, addAction, login, userIdByName, workedTicket } from './support'

type Page = import('@playwright/test').Page

const section = (page: Page) => page.locator('#actions-taken')
const rows = (page: Page) => section(page).locator('tbody tr')
const form = (page: Page) => page.locator('.actions__form')
const panel = (page: Page) => page.getByRole('region', { name: 'Action details' })
const view = (page: Page, row: number) => rows(page).nth(row).getByRole('button', { name: /^View Action from/ })
const statusSelect = (page: Page) => page.getByRole('combobox', { name: 'Status' })

const storedActions = async (page: Page, ticketId: string) => {
  const response = await page.request.get(`${API_BASE_URL}/api/tickets/${ticketId}/actions`)
  expect(response.ok(), 'reading the Actions').toBeTruthy()
  return ((await response.json()) as { data: { description: string; version: number; actionAt: string }[] }).data
}

test('E2E-07 · AC-14 · AC-36 · a retry after a lost response keeps what was changed meanwhile', async ({ page, e2eSummaries }) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'lost response')
  await login(page.request, PEOPLE.olivia)

  // The server commits the first create, then its answer is lost on the way back.
  let lost = false
  await page.route('**/api/tickets/*/actions', async (route) => {
    if (route.request().method() !== 'POST' || lost) return route.continue()
    lost = true
    await route.fetch()
    await route.abort('failed')
  })
  await page.goto(`/staff/tickets/${ticketId}`)
  await section(page).getByRole('button', { name: 'Add Action' }).click()
  await form(page).getByLabel('Description').fill('First intent')
  await form(page).getByRole('button', { name: 'Save Action' }).click()
  await expect(form(page).getByText('The Action could not be saved. Your entries are kept.')).toBeVisible()

  await form(page).getByLabel('Description').fill('Changed intent')
  await form(page).getByRole('button', { name: 'Try again' }).click()

  await expect(form(page)).toHaveCount(0)
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page).first()).toContainText('Changed intent')
  const stored = await storedActions(page, ticketId)
  expect(stored.map((action) => action.description), 'one Action, with the changed text').toEqual(['Changed intent'])
  expect(stored[0].version, 'created once, then updated once').toBe(2)
})

test('E2E-08 · BR-23 · AC-13 · a form left open when the Ticket is resolved can no longer be saved', async ({ page, e2eSummaries }) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'resolved under a form')
  await page.goto(`/staff/tickets/${ticketId}`)
  await section(page).getByRole('button', { name: 'Add Action' }).click()
  await form(page).getByLabel('Description').fill('Unsaved wording')

  await expect(statusSelect(page)).toBeEnabled()
  await statusSelect(page).selectOption('RESOLVED')
  await expect(page.getByText('Status changed to Resolved.')).toBeVisible()

  await expect(form(page).getByRole('button', { name: 'Save Action' })).toHaveCount(0)
  await expect(form(page).getByLabel('Description')).toHaveValue('Unsaved wording')
  await expect(form(page).getByLabel('Description')).toBeDisabled()
  await expect(form(page).getByText('This Ticket no longer takes Actions, so these entries cannot be saved.')).toBeVisible()
  await form(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(form(page)).toHaveCount(0)
  expect(await storedActions(page, ticketId)).toEqual([])
})

test('A11Y-02 · AC-35 · ui-spec §9 · the first invalid field takes the focus, a closed panel gives it back, a busy dialog keeps it', async ({
  page,
  e2eSummaries,
}) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'focus rules')
  const olivia = await userIdByName(page.request, ticketId, 'Olivia Reed')
  await addAction(page.request, ticketId, olivia, 'First Action.')
  await addAction(page.request, ticketId, olivia, 'Second Action.')
  await login(page.request, PEOPLE.olivia)
  await page.goto(`/staff/tickets/${ticketId}`)
  await expect(rows(page)).toHaveCount(2)

  // The first invalid field receives the focus, and a cancelled form gives it back to Add Action.
  await section(page).getByRole('button', { name: 'Add Action' }).click()
  await form(page).getByLabel('Description').fill('Needs a follow-up.')
  await form(page).getByRole('checkbox', { name: 'Follow-Up Required?' }).check()
  await form(page).getByRole('button', { name: 'Save Action' }).click()
  await expect(form(page).getByText('Enter the follow-up note.')).toBeVisible()
  await expect(form(page).getByLabel('Follow-up Note')).toBeFocused()
  await form(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(section(page).getByRole('button', { name: 'Add Action' })).toBeFocused()

  // Closing the details returns to the row's View button.
  await view(page, 1).click()
  await expect(panel(page).getByRole('heading', { name: 'Action details' })).toBeFocused()
  await panel(page).getByRole('button', { name: 'Close' }).click()
  await expect(view(page, 1)).toBeFocused()

  // While the cancellation is in flight every dialog control is disabled, and Tab still cannot leave the dialog.
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/tickets/*/actions/*/status', async (route) => {
    await gate
    await route.continue()
  })
  await view(page, 0).click()
  await panel(page).getByRole('button', { name: 'Cancel Action' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Reason').fill('No longer needed.')
  await dialog.getByRole('button', { name: 'Cancel Action' }).click()
  await expect(dialog.getByLabel('Reason')).toBeDisabled()
  const inside = () => page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('Tab')
    expect(await inside(), `after ${i + 1} tabs`).toBe(true)
    await page.keyboard.press('Shift+Tab')
    expect(await inside(), `after ${i + 1} shift-tabs`).toBe(true)
  }

  release()
  await expect(dialog).toHaveCount(0)
  await expect(rows(page).nth(0).getByText('Cancelled')).toBeVisible()
  await expect(panel(page).getByRole('heading', { name: 'Action details' })).toBeFocused()
})

test.describe('E2E-09 · api-spec §1 · times are Bangkok time on a device in another zone', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })

  test('shows the Actions and the history in Asia/Bangkok', async ({ page, e2eSummaries }) => {
    const { ticketId } = await workedTicket(page, e2eSummaries, 'device zone')
    const olivia = await userIdByName(page.request, ticketId, 'Olivia Reed')
    await addAction(page.request, ticketId, olivia, 'An Action to date.')
    await login(page.request, PEOPLE.olivia)

    const bangkok = (iso: string) =>
      new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(iso))
    const [action] = await storedActions(page, ticketId)
    const history = await page.request.get(`${API_BASE_URL}/api/tickets/${ticketId}/history`)
    const events = ((await history.json()) as { data: { createdAt: string }[] }).data

    await page.goto(`/staff/tickets/${ticketId}`)
    await expect(rows(page).first().getByRole('cell').first()).toHaveText(bangkok(action.actionAt))
    await expect(page.getByRole('region', { name: 'History' }).locator('time')).toHaveText(events.map((event) => bangkok(event.createdAt)))
  })
})
