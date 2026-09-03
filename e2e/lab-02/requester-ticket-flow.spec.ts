import { expect, test } from './fixtures'
import { createTicket, selectRequester } from './helpers'

// E2E-01 · AC-01, AC-06, AC-15, AC-18 · TDT-05 error guessing.
test('E2E-01 completes requester creation and My Tickets journey', async ({
  page,
  e2eSummaries,
}) => {
  const summary = `E2E creation ${Date.now()}`
  e2eSummaries.add(summary)
  await selectRequester(page, 'Jennifer Anderson')

  const created = await createTicket(page, summary, 'e2e-creation.png')
  await expect(page.getByText(created.ticketNumber, { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'View Ticket' }).click()
  await expect(page).toHaveURL(`/tickets/${created.ticketId}`)
  await expect(page.getByRole('link', { name: 'Download e2e-creation.png' })).toBeVisible()

  await page.goto('/tickets')
  const search = page.getByRole('searchbox', { name: 'Search' })
  await search.fill(summary)
  const matchingTicket = page.getByRole('row').filter({
    has: page.getByRole('link', { name: created.ticketNumber, exact: true }),
  })
  await expect(matchingTicket).toContainText(summary)
})
