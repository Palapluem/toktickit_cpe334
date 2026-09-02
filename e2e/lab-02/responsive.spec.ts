import { expect, test } from '@playwright/test'
import {
  VIEWPORTS,
  captureScreenshot,
  createTicket,
  expectNoPageOverflow,
  selectRequester,
} from './helpers'

// RESP-01 · AC-35 · STY-023, STY-024 · TDT-01 equivalence partitioning.
test('RESP-01 renders Create Ticket at desktop, tablet, and mobile', async ({ page }) => {
  await selectRequester(page, 'Jennifer Anderson')

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto('/tickets/new')
    await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible()
    await expectNoPageOverflow(page)
    await captureScreenshot(page, 'create-ticket', `${viewport.name}-initial.png`)
  }
})

// RESP-02 · AC-35 · STY-023, STY-024, STY-025 · TDT-01 equivalence partitioning.
test('RESP-02 renders My Tickets at desktop, tablet, and mobile', async ({ page }) => {
  await selectRequester(page, 'Jennifer Anderson')
  await page.goto('/tickets/new')
  const summary = `E2E responsive list ${Date.now()}`
  await createTicket(page, summary)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto('/tickets')
    await expect(page.getByText(summary, { exact: true })).toBeVisible()
    await expectNoPageOverflow(page)
    await captureScreenshot(
      page,
      'my-tickets',
      viewport.name === 'mobile' ? 'mobile-cards.png' : `${viewport.name}-list.png`,
    )
  }
})

// RESP-03 · AC-35 · STY-023, STY-024 · TDT-01 equivalence partitioning.
test('RESP-03 renders Ticket Detail at desktop, tablet, and mobile', async ({ page }) => {
  await selectRequester(page, 'Jennifer Anderson')
  const created = await createTicket(page, `E2E responsive detail ${Date.now()}`)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto(`/tickets/${created.ticketId}`)
    await expect(page.getByRole('heading', { name: 'Ticket Details' })).toBeVisible()
    await expectNoPageOverflow(page)
    await captureScreenshot(page, 'ticket-detail', `${viewport.name}-detail.png`)
  }
})
