// E2E-01, E2E-03 (Action half), RESP-01 and A11Y-01 for Ticket Detail · lab-04 AC-01 to AC-14, AC-34 to AC-36.
// Captures go to artifacts/lab-04/screenshots/actions-taken only with CAPTURE_EVIDENCE=1; fixture states say so in their name.
import { test, expect } from '../lab-02/fixtures'
import { API_BASE_URL, captureLab4Screenshot, expectNoPageOverflow, signOut } from '../lab-02/helpers'
import { PEOPLE, addAction, changeStatus, login, userIdByName, workedTicket } from './support'

type Page = import('@playwright/test').Page
const SHOT = 'actions-taken'

const section = (page: Page) => page.locator('#actions-taken')
const rows = (page: Page) => section(page).locator('tbody tr')
const form = (page: Page) => page.locator('.actions__form')
const panel = (page: Page) => page.getByRole('region', { name: 'Action details' })
const view = (page: Page, row: number) => rows(page).nth(row).getByRole('button', { name: /^View Action from/ })

async function addThroughForm(page: Page, description: string, assignee?: string) {
  await section(page).getByRole('button', { name: 'Add Action' }).click()
  await form(page).getByLabel('Description').fill(description)
  if (assignee) await form(page).getByLabel('Assignee').selectOption({ label: assignee })
  await form(page).getByRole('button', { name: 'Save Action' }).click()
}

test('E2E-01 · AC-01 to AC-10, AC-12 · Olivia works a Ticket Daniel owns, and the Requester reads it all', async ({
  page,
  request,
  e2eSummaries,
}) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'actions flow')
  await login(page.request, PEOPLE.olivia)
  await page.goto(`/staff/tickets/${ticketId}`)
  await expect(section(page).getByText('No Actions have been recorded yet.')).toBeVisible()

  // Create mode: focus, defaults, a conditional field and the system fields as text (AC-01, AC-10).
  await section(page).getByRole('button', { name: 'Add Action' }).click()
  await expect(form(page).getByLabel('Description')).toBeFocused()
  await expect(form(page).getByLabel('Assignee').locator('option:checked')).toHaveText('Olivia Reed')
  await expect(form(page).getByText('Recorded automatically when you save')).toBeVisible()
  await captureLab4Screenshot(page, SHOT, 'create-form.png')
  await form(page).getByLabel('Description').fill('Collect the relay error from the mail gateway log.')
  await form(page).getByRole('checkbox', { name: 'Follow-Up Required?' }).check()
  await form(page).getByRole('button', { name: 'Save Action' }).click()
  await expect(form(page).getByText('Enter the follow-up note.')).toBeVisible()
  await form(page).getByLabel('Follow-up Note').fill('Confirm with the vendor whether the allow-list was truncated.')
  await form(page).getByLabel('Attachment Notes').fill('relay-error.png')
  await captureLab4Screenshot(page, SHOT, 'follow-up-required.png')
  await form(page).getByRole('button', { name: 'Save Action' }).click()
  await expect(section(page).getByRole('heading', { name: 'Actions Taken (1)' })).toBeVisible()

  await addThroughForm(page, 'Restore the allow-list.', 'Patricia Evans')
  await expect(section(page).getByRole('heading', { name: 'Actions Taken (2)' })).toBeVisible()
  await addThroughForm(page, 'Call the vendor.')
  await expect(section(page).getByRole('heading', { name: 'Actions Taken (3)' })).toBeVisible()
  await expect(rows(page).nth(0)).toContainText('Collect the relay error')
  await expect(rows(page).nth(1)).toContainText('Patricia Evans')
  await expect(rows(page).nth(2)).toContainText('Call the vendor.')
  await expect(rows(page).first().getByText('Planned')).toBeVisible()

  // An assignee deactivated after the list was loaded is refused on the field (AC-04).
  const daniel = await userIdByName(page.request, ticketId, 'Daniel Carter')
  await section(page).getByRole('button', { name: 'Add Action' }).click()
  await form(page).getByLabel('Description').fill('Check the mail queue.')
  await form(page).getByLabel('Assignee').selectOption({ label: 'Daniel Carter' })
  await login(request, PEOPLE.margaret)
  const off = await request.patch(`${API_BASE_URL}/api/admin/users/${daniel}`, { data: { isActive: false } })
  expect(off.ok(), 'deactivating Daniel').toBeTruthy()
  try {
    await form(page).getByRole('button', { name: 'Save Action' }).click()
    await expect(form(page).getByText('Choose an active IT Staff member or Administrator.')).toBeVisible()
    await expect(form(page).getByLabel('Description')).toHaveValue('Check the mail queue.')
    await captureLab4Screenshot(page, SHOT, 'inactive-assignee-refused.png')
  } finally {
    const on = await request.patch(`${API_BASE_URL}/api/admin/users/${daniel}`, { data: { isActive: true } })
    expect(on.ok(), 'reactivating Daniel').toBeTruthy()
  }
  await form(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(rows(page)).toHaveCount(3)

  // Edit and reassign (AC-05).
  await view(page, 0).click()
  await expect(panel(page).getByRole('heading', { name: 'Action details' })).toBeFocused()
  await panel(page).getByRole('button', { name: 'Edit' }).click()
  await panel(page).getByLabel('Description').fill('Collect the relay error and the gateway log.')
  await panel(page).getByLabel('Assignee').selectOption({ label: 'Patricia Evans' })
  await captureLab4Screenshot(page, SHOT, 'edit-reassign.png')
  await panel(page).getByRole('button', { name: 'Save changes' }).click()
  await expect(panel(page)).toContainText('Collect the relay error and the gateway log.')
  await expect(rows(page).nth(0)).toContainText('Patricia Evans')

  // Start, then complete: the Result is asked for first (AC-06, AC-07).
  await view(page, 1).click()
  await panel(page).getByRole('button', { name: 'Start' }).click()
  await expect(rows(page).nth(1).getByText('In progress')).toBeVisible()
  await captureLab4Screenshot(page, SHOT, 'started.png')
  await panel(page).getByRole('button', { name: 'Complete' }).click()
  await expect(panel(page).getByText('Enter the result before completing this Action.')).toBeVisible()
  await expect(panel(page).getByLabel('Result')).toBeFocused()
  await captureLab4Screenshot(page, SHOT, 'complete-result-required.png')
  await panel(page).getByLabel('Result').fill('Allow-list restored; external mail delivered.')
  await panel(page).getByRole('button', { name: 'Complete' }).click()
  await expect(rows(page).nth(1).getByText('Completed')).toBeVisible()
  await expect(panel(page).getByRole('button', { name: 'Edit' })).toHaveCount(0)
  await captureLab4Screenshot(page, SHOT, 'completed.png')

  // Cancel through the dialog; a finished Action is read-only (AC-08, AC-09).
  await view(page, 2).click()
  await panel(page).getByRole('button', { name: 'Cancel Action' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Reason')).toBeFocused()
  await captureLab4Screenshot(page, SHOT, 'cancel-dialog.png')
  await dialog.getByRole('button', { name: 'Cancel Action' }).click()
  await expect(dialog.getByText('Enter the reason for cancelling.')).toBeVisible()
  await dialog.getByLabel('Reason').fill('The vendor was reached by email instead.')
  await dialog.getByRole('button', { name: 'Cancel Action' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(rows(page).nth(2).getByText('Cancelled')).toBeVisible()
  await expect(panel(page)).toContainText('The vendor was reached by email instead.')
  await expect(panel(page).getByRole('button', { name: 'Cancel Action' })).toHaveCount(0)
  await captureLab4Screenshot(page, SHOT, 'cancelled.png')

  // Persisted: the list survives a reload, in the same order (AC-03).
  await page.reload()
  await expect(rows(page)).toHaveCount(3)
  await expect(rows(page).nth(2).getByText('Cancelled')).toBeVisible()

  // The Requester reads everything and can change nothing (AC-12).
  await signOut(page)
  await login(page.request, PEOPLE.jennifer)
  await page.goto(`/tickets/${ticketId}`)
  await expect(section(page).getByRole('heading', { name: 'Actions Taken (3)' })).toBeVisible()
  await expect(section(page).getByRole('button', { name: 'Add Action' })).toHaveCount(0)
  await expect(section(page)).not.toContainText('Internal Notes')
  await view(page, 1).click()
  await expect(panel(page)).toContainText('Allow-list restored; external mail delivered.')
  await expect(panel(page)).toContainText('Patricia Evans')
  for (const name of ['Edit', 'Start', 'Complete', 'Cancel Action']) {
    await expect(panel(page).getByRole('button', { name })).toHaveCount(0)
  }
  await captureLab4Screenshot(page, SHOT, 'requester-read-only.png')
  const api = await page.request.get(`${API_BASE_URL}/api/tickets/${ticketId}/actions`)
  const body = JSON.stringify(await api.json())
  expect(body).not.toMatch(/"id":"[0-9a-f-]{36}","displayName"|isActive|"email"/)
})

test('E2E-01 · AC-13 · a Ticket that is not workable shows the banner instead of Add Action', async ({ page, e2eSummaries }) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'not workable')
  await changeStatus(page.request, ticketId, 'RESOLVED')
  await login(page.request, PEOPLE.olivia)
  await page.goto(`/staff/tickets/${ticketId}`)

  await expect(section(page).getByText('This Ticket is Resolved. Actions are read-only — reopen the Ticket to record more work.')).toBeVisible()
  await expect(section(page).getByRole('button', { name: 'Add Action' })).toHaveCount(0)
  await captureLab4Screenshot(page, SHOT, 'ticket-not-workable.png')
})

test('E2E-03 · AC-14 · AC-19 · AC-36 · a conflict and a save failure keep what was typed', async ({ page, browser, e2eSummaries }) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'action conflict')
  const olivia = await userIdByName(page.request, ticketId, 'Olivia Reed')
  await addAction(page.request, ticketId, olivia, 'Collect the relay error.')

  await login(page.request, PEOPLE.olivia)
  await page.goto(`/staff/tickets/${ticketId}`)
  await view(page, 0).click()
  await panel(page).getByRole('button', { name: 'Edit' }).click()
  await panel(page).getByLabel('Description').fill('My wording, written while Patricia edited too.')

  // Another session saves first.
  const other = await browser.newContext()
  try {
    await login(other.request, PEOPLE.patricia)
    const list = await other.request.get(`${API_BASE_URL}/api/tickets/${ticketId}/actions`)
    const [current] = (await list.json()).data as { id: string; version: number }[]
    const saved = await other.request.patch(`${API_BASE_URL}/api/tickets/${ticketId}/actions/${current.id}`, {
      data: { expectedVersion: current.version, description: "Patricia's wording." },
    })
    expect(saved.ok()).toBeTruthy()
  } finally {
    await other.close()
  }

  await panel(page).getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Someone else changed this Action. The latest version is shown; your unsaved entries are kept in the form.')).toBeVisible()
  await expect(panel(page).getByLabel('Description')).toHaveValue('My wording, written while Patricia edited too.')
  await expect(rows(page).first()).toContainText("Patricia's wording.")
  await captureLab4Screenshot(page, SHOT, 'conflict.png')

  // A failed save (fixture: the request is answered with a 500) keeps the entries and offers Try again.
  await page.route('**/api/tickets/*/actions/*', (route) => (route.request().method() === 'PATCH' ? route.fulfill({ status: 500, body: '{}' }) : route.continue()))
  await panel(page).getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('The Action could not be saved. Your entries are kept.')).toBeVisible()
  await captureLab4Screenshot(page, SHOT, 'save-failure-fixture.png')
  await page.unroute('**/api/tickets/*/actions/*')
  await panel(page).getByRole('button', { name: 'Try again' }).click()
  await expect(rows(page).first()).toContainText('My wording, written while Patricia edited too.')
})

test('RESP-01 · AC-34 · Ticket Detail with Actions fits every width, with 2000-character Description, Follow-up Note and Result and 500-character Attachment Notes', async ({ page, e2eSummaries }) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'responsive actions')
  const olivia = await userIdByName(page.request, ticketId, 'Olivia Reed')
  const long = 'W'.repeat(2000)
  await addAction(page.request, ticketId, olivia, long, { followUpRequired: true, followUpNote: long, attachmentNotes: 'n'.repeat(500) })
  await addAction(page.request, ticketId, olivia, 'A short Action.')
  await addAction(page.request, ticketId, olivia, 'Another Action with a normal description.')
  const finished = await addAction(page.request, ticketId, olivia, 'An Action with the longest Result.')
  const started = await page.request.patch(`${API_BASE_URL}/api/tickets/${ticketId}/actions/${finished.id}/status`, { data: { expectedVersion: 1, status: 'IN_PROGRESS' } })
  expect(started.ok(), 'starting the Action').toBeTruthy()
  const completed = await page.request.patch(`${API_BASE_URL}/api/tickets/${ticketId}/actions/${finished.id}/status`, {
    data: { expectedVersion: 2, status: 'COMPLETED', result: 'R'.repeat(2000) },
  })
  expect(completed.ok(), 'completing the Action with a 2000-character Result').toBeTruthy()
  await login(page.request, PEOPLE.olivia)

  const widths = [
    { width: 1280, height: 900, name: 'list-multiple-desktop.png' },
    { width: 834, height: 1112, name: 'list-tablet.png' },
    { width: 390, height: 844, name: 'list-mobile.png' },
    { width: 767, height: 900 },
    { width: 768, height: 900 },
    { width: 991, height: 900 },
    { width: 992, height: 900 },
  ]
  for (const { width, height, name } of widths) {
    await page.setViewportSize({ width, height })
    await page.goto(`/staff/tickets/${ticketId}`)
    await expect(rows(page)).toHaveCount(4)
    await view(page, 0).click()
    await expect(panel(page)).toContainText('W'.repeat(100))
    await expectNoPageOverflow(page)
    await view(page, 3).click()
    await expect(panel(page)).toContainText('R'.repeat(100))
    await expectNoPageOverflow(page)

    // A table from 992 px, labelled cards below it (AC-03, AC-34).
    const headerPosition = await section(page).locator('thead').evaluate((el) => getComputedStyle(el).position)
    expect(headerPosition === 'absolute', `${width}px shows ${headerPosition === 'absolute' ? 'cards' : 'the table'}`).toBe(width < 992)
    if (width === 390) {
      const box = await view(page, 1).boundingBox()
      expect(box!.height, 'touch target').toBeGreaterThanOrEqual(44)
    }
    if (name) {
      await section(page).scrollIntoViewIfNeeded()
      await captureLab4Screenshot(page, SHOT, name)
    }
  }
})

test('A11Y-01 · AC-35 · the Action form and the cancel dialog work from the keyboard alone', async ({ page, e2eSummaries }) => {
  const { ticketId } = await workedTicket(page, e2eSummaries, 'keyboard actions')
  const olivia = await userIdByName(page.request, ticketId, 'Olivia Reed')
  await addAction(page.request, ticketId, olivia, 'An Action to cancel by keyboard.')
  await login(page.request, PEOPLE.olivia)
  await page.goto(`/staff/tickets/${ticketId}`)
  await expect(rows(page)).toHaveCount(1)

  // Create: open with Enter, type, Tab through in visual order, save with Enter.
  const add = section(page).getByRole('button', { name: 'Add Action' })
  await add.focus()
  await page.keyboard.press('Enter')
  await expect(form(page).getByLabel('Description')).toBeFocused()
  await page.keyboard.type('Reached by keyboard.')
  const order = [form(page).getByLabel('Assignee'), form(page).getByRole('checkbox', { name: 'Follow-Up Required?' }), form(page).getByLabel('Attachment Notes'), form(page).getByRole('button', { name: 'Save Action' })]
  for (const next of order) {
    await page.keyboard.press('Tab')
    await expect(next).toBeFocused()
  }
  const ring = await form(page).getByRole('button', { name: 'Save Action' }).evaluate((el) => {
    const style = getComputedStyle(el)
    return { boxShadow: style.boxShadow, outline: `${style.outlineStyle} ${style.outlineWidth}` }
  })
  expect(ring.boxShadow !== 'none' || !ring.outline.startsWith('none'), `focus is visible: ${JSON.stringify(ring)}`).toBe(true)
  await page.keyboard.press('Enter')
  await expect(rows(page)).toHaveCount(2)

  // Cancel: open with Enter, the focus stays inside, Escape closes and returns to the trigger.
  await view(page, 0).focus()
  await page.keyboard.press('Enter')
  const trigger = panel(page).getByRole('button', { name: 'Cancel Action' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Reason')).toBeFocused()
  for (let i = 0; i < 7; i += 1) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement)), `tab ${i + 1} stays inside`).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
