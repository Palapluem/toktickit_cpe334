import { expect, test } from './fixtures'
import { createTicket, signIn, signOut } from './helpers'

// E2E-02 · AC-19, AC-28 · TDT-05 direct-URL error guessing.
test('E2E-02 isolates tickets between signed-in users', async ({
  page,
  e2eSummaries,
}) => {
  const summary = `E2E private ${Date.now()}`
  e2eSummaries.add(summary)
  await signIn(page, 'Jennifer Anderson')
  const created = await createTicket(page, summary)

  await signOut(page)
  await signIn(page, 'Sarah Johnson')
  await page.goto('/tickets')
  await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible()
  await expect(page.getByText(summary, { exact: true })).not.toBeVisible()

  await page.goto(`/tickets/${created.ticketId}`)
  await expect(
    page.getByText('This Ticket is not available to you.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText(summary, { exact: true })).not.toBeVisible()
})
