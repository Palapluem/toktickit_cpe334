// REG-04 · lab-04 FR-22, AC-37 — the Lab 1 to 3 journeys the labsheet names for Part 8 still work on the Lab 4 code, and are captured at three widths.
// Captures go to artifacts/lab-04/screenshots/regression only with CAPTURE_EVIDENCE=1. Everything created here starts with "E2E " and is cleaned up.
import { test, expect } from './audit'
import { API_BASE_URL, VIEWPORTS, DEVELOPMENT_PASSWORD, captureLab4Screenshot, createTicket, expectNoPageOverflow, pngFile, signOut } from '../lab-02/helpers'
import { PEOPLE, login } from './support'

type Page = import('@playwright/test').Page
const SHOT = 'regression'

/** Captures the same state at desktop, tablet and phone width; none of them may scroll sideways. */
async function atEveryWidth(page: Page, name: string, { heading = true } = {}): Promise<void> {
  for (const { name: width, width: w, height } of VIEWPORTS) {
    await page.setViewportSize({ width: w, height })
    // A "not found" state is a message in the shell, not a page of its own, so it has no heading of its own.
    if (heading) await expect(page.getByRole('heading').first()).toBeVisible()
    await expectNoPageOverflow(page)
    await captureLab4Screenshot(page, SHOT, `${name}-${width}.png`)
  }
  await page.setViewportSize({ width: VIEWPORTS[0].width, height: VIEWPORTS[0].height })
}

test('REG-04 · FR-22 · sign-in, My Tickets, Ticket Detail with an attachment and a comment, the Queue, an Internal Note and User Management', async ({
  page,
  audit,
  e2eSummaries,
}) => {
  // The session check of a signed-out visit answers 401 by the Lab 3 contract (api-spec §2); Chromium logs every non-2xx fetch.
  audit.allowResponse('a signed-out visit asks who is signed in and is answered 401 (lab-03 api-spec §2)', 401, 'GET', /^\/api\/auth\/me$/)
  audit.allowResponse('a Ticket that does not exist answers 404 to IT Staff (lab-03 BR-14)', 404, 'GET', /^\/api\/staff\/tickets\/[0-9a-f-]+$/)
  audit.allowResponse('another Requester\'s Ticket answers 404, exactly like a missing one (lab-03 BR-14)', 404, 'GET', /^\/api\/tickets\/[0-9a-f-]+$/)

  // Sign in through the screen, as a Requester (Lab 3).
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await atEveryWidth(page, 'login')
  await page.getByLabel('Email').fill(PEOPLE.jennifer)
  await page.getByLabel('Password').fill(DEVELOPMENT_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()

  // My Tickets lists the Requester's Tickets, and a Ticket created with an attachment appears (Lab 2).
  const summary = `E2E regression ${Date.now()}`
  e2eSummaries.add(summary)
  const { ticketId } = await createTicket(page, summary, 'regression-first.png')
  await page.goto('/tickets')
  await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible()
  await expect(page.getByText(summary).first()).toBeVisible()
  await page.getByPlaceholder('Search by ticket number or summary…').fill(summary)
  // The list follows the search after a short delay; the capture waits for it, so the filter and the list agree.
  await expect(page.getByText(/Showing 1 to 1 of 1 ticket/)).toBeVisible()
  await atEveryWidth(page, 'my-tickets')

  // Ticket Detail: an attachment added through the screen, and a Public Comment (Lab 2 and Lab 3).
  await page.goto(`/tickets/${ticketId}`)
  await page.getByLabel('Attachment file').setInputFiles(pngFile('regression-second.png'))
  await expect(page.getByRole('link', { name: 'Download regression-second.png' })).toBeVisible()
  await page.getByLabel('Add a comment').fill('The printer still stops after the second page.')
  await page.getByRole('button', { name: 'Post Comment' }).click()
  await expect(page.getByText('The printer still stops after the second page.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download regression-first.png' })).toBeVisible()
  await atEveryWidth(page, 'requester-detail-attachments-comments')

  // IT Staff: the Queue finds the Ticket, and an Internal Note stays private (Lab 3).
  await signOut(page)
  await login(page.request, PEOPLE.patricia)
  await page.goto('/staff/tickets')
  await expect(page.getByRole('heading', { name: 'Ticket Queue', exact: true })).toBeVisible()
  await page.getByPlaceholder('Search by ticket number or summary…').fill(summary)
  await expect(page.getByRole('link', { name: /^TKT-/ })).toHaveCount(1)
  await atEveryWidth(page, 'staff-queue')
  await page.getByRole('link', { name: /^TKT-/ }).click()
  await expect(page.getByRole('region', { name: 'Internal Notes' })).toBeVisible()
  await page.getByLabel('Add an internal note').fill('Check the spooler on the print server before calling the vendor.')
  await page.getByRole('button', { name: 'Add Internal Note' }).click()
  await expect(page.getByText('Check the spooler on the print server before calling the vendor.')).toBeVisible()
  await atEveryWidth(page, 'staff-detail-internal-notes')

  // A Ticket that does not exist is "not found" for staff, a state of its own beside forbidden and failure (ui-spec §11 row 16).
  await page.goto('/staff/tickets/00000000-0000-4000-8000-000000000000')
  await expect(page.getByText('Ticket not found')).toBeVisible()
  await atEveryWidth(page, 'staff-ticket-not-found', { heading: false })
  const others = await page.request.get(`${API_BASE_URL}/api/staff/tickets?search=TKT-2026-900003`)
  const othersTicketId = ((await others.json()) as { data: { id: string }[] }).data[0]?.id
  expect(othersTicketId, 'the seeded Ticket of another Requester').toBeDefined()

  // The Requester still sees the comment and never the note (Lab 3, BR-17).
  await signOut(page)
  await login(page.request, PEOPLE.jennifer)
  await page.goto(`/tickets/${ticketId}`)
  await expect(page.getByText('The printer still stops after the second page.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Internal Notes' })).toHaveCount(0)
  await expect(page.getByText('Check the spooler on the print server')).toHaveCount(0)

  // Another Requester's Ticket looks exactly like one that does not exist (lab-03 BR-14).
  await page.goto(`/tickets/${othersTicketId}`)
  await expect(page.getByText('This Ticket is not available to you.')).toBeVisible()
  await atEveryWidth(page, 'requester-ticket-unavailable')

  // The Administrator manages users (Lab 3).
  await signOut(page)
  await login(page.request, PEOPLE.margaret)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'User Management', exact: true })).toBeVisible()
  await expect(page.getByRole('row').nth(1)).toBeVisible()
  await atEveryWidth(page, 'user-management')
})
