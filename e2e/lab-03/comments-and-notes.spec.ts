// Evidence for Issue #52: the visual distinction, and the refusal.
//
// The refusal capture matters most. A Requester must not learn that Internal
// Notes exist at all, so the evidence is a screenshot of their Ticket Detail
// with nothing internal on it, next to the staff view of the same Ticket.
import { expect, test } from '../lab-02/fixtures'
import { DEVELOPMENT_PASSWORD, captureLab3Screenshot } from '../lab-02/helpers'

const API = 'http://127.0.0.1:3002'

const STAFF = 'patricia.evans@example.ac.th'
// Seeded: TKT-2026-900003 belongs to Sarah Johnson and carries a note.
// Not David Lee's — that account is the one left behind the must-change gate
// for the L3-6 captures, so signing in as them never reaches a Ticket.
const OWNING_REQUESTER = 'sarah.johnson@example.ac.th'
const TICKET_NO = 'TKT-2026-900003'
const NOTE_FRAGMENT = 'Relay allow-list'

async function signIn(
  page: import('@playwright/test').Page,
  email: string,
): Promise<void> {
  const login = await page.request.post(`${API}/api/auth/login`, {
    data: { email, password: DEVELOPMENT_PASSWORD },
  })
  expect(login.ok(), `login for ${email}`).toBeTruthy()
}

async function openStaffTicket(
  page: import('@playwright/test').Page,
): Promise<string> {
  await page.goto('/staff/tickets')
  await page.getByPlaceholder('Search by ticket number or summary…').fill(TICKET_NO)
  const link = page.getByRole('link', { name: TICKET_NO })
  await expect(link).toBeVisible()
  const href = (await link.getAttribute('href'))!
  await page.goto(href)
  return href.split('/').pop()!
}

test('THREAD-01 captures both threads, visually distinct', async ({ page }) => {
  await signIn(page, STAFF)
  await openStaffTicket(page)

  const comments = page.getByRole('region', { name: 'Public Comments' })
  const notes = page.getByRole('region', { name: 'Internal Notes' })

  await expect(comments).toBeVisible()
  await expect(comments).toContainText('Visible to the Requester')
  await expect(notes).toBeVisible()
  await expect(notes).toContainText('IT Staff and Administrator only')
  await expect(notes).toContainText(NOTE_FRAGMENT)
  // Every internal entry carries the tag, not only the section heading.
  await expect(notes.getByText('Internal').first()).toBeVisible()

  // Never one control in two modes (ui-spec §9).
  await expect(page.getByRole('tab')).toHaveCount(0)

  await captureLab3Screenshot(page, 'staff-ticket-detail', 'comments-and-notes.png')
})

test('THREAD-02 posts to each thread through its own composer', async ({ page }) => {
  await signIn(page, STAFF)
  const ticketId = await openStaffTicket(page)

  const stamp = Date.now()
  await page.getByLabel('Add a comment').fill(`Public update ${stamp}`)
  await page.getByRole('button', { name: 'Post Comment' }).click()
  await expect(page.getByText(`Public update ${stamp}`)).toBeVisible()

  await page.getByLabel('Add an internal note').fill(`Internal remark ${stamp}`)
  await page.getByRole('button', { name: 'Add Internal Note' }).click()
  await expect(page.getByText(`Internal remark ${stamp}`)).toBeVisible()

  // Each landed in its own store, not the other.
  const comments = await page.request.get(`${API}/api/tickets/${ticketId}/comments`)
  expect(JSON.stringify(await comments.json())).not.toContain(`Internal remark ${stamp}`)

  const notes = await page.request.get(`${API}/api/tickets/${ticketId}/internal-notes`)
  expect(JSON.stringify(await notes.json())).not.toContain(`Public update ${stamp}`)
})

test('THREAD-03 captures what the Requester sees, and does not', async ({ page }) => {
  await signIn(page, OWNING_REQUESTER)
  await page.goto('/tickets')

  const link = page.getByRole('link', { name: TICKET_NO })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page.getByRole('region', { name: 'Public Comments' })).toBeVisible()

  // No section, no heading, no disabled affordance, and no note content.
  await expect(page.getByRole('region', { name: 'Internal Notes' })).toHaveCount(0)
  await expect(page.getByText('Internal Notes')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add Internal Note' })).toHaveCount(0)
  await expect(page.getByText(NOTE_FRAGMENT)).toHaveCount(0)

  await captureLab3Screenshot(page, 'staff-ticket-detail', 'requester-view-no-notes.png')
})

test('THREAD-04 refuses the Requester directly, revealing no count', async ({ page }) => {
  await signIn(page, OWNING_REQUESTER)
  await page.goto('/tickets')
  const link = page.getByRole('link', { name: TICKET_NO })
  await expect(link).toBeVisible()
  const ticketId = (await link.getAttribute('href'))!.split('/').pop()!

  const refused = await page.request.get(`${API}/api/tickets/${ticketId}/internal-notes`)
  expect(refused.status()).toBe(403)

  const body = JSON.stringify(await refused.json())
  expect(body).not.toContain(NOTE_FRAGMENT)
  expect(body).not.toContain('"data"')

  // And writing one is refused too.
  const written = await page.request.post(`${API}/api/tickets/${ticketId}/internal-notes`, {
    data: { body: 'Let me in.' },
  })
  expect(written.status()).toBe(403)
})
