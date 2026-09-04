import { expect, test } from './fixtures'
import { createTicket, selectRequester } from './helpers'

// E2E-02 · AC-19, AC-28 · TDT-05 direct-URL error guessing.
test('E2E-02 isolates tickets after switching requester', async ({
  page,
  e2eSummaries,
}) => {
  const summary = `E2E private ${Date.now()}`
  e2eSummaries.add(summary)
  await selectRequester(page, 'Jennifer Anderson')
  const created = await createTicket(page, summary)

  await selectRequester(page, 'Sarah Johnson')
  await page.goto('/tickets')
  await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible()
  await expect(page.getByText(summary, { exact: true })).not.toBeVisible()

  await page.goto(`/tickets/${created.ticketId}`)
  await expect(
    page.getByText('This Ticket is unavailable in the current requester context.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByText(summary, { exact: true })).not.toBeVisible()
})
