import { expect, test } from './fixtures'
import {
  API_BASE_URL,
  createTicket,
  getRequesterId,
  pngFile,
  selectRequester,
} from './helpers'

// E2E-03 · AC-29, AC-31, AC-32, AC-33 · TDT-04 state transition.
test('E2E-03 covers add, download, soft-remove, and blocked attachment', async ({
  page,
  request,
  e2eSummaries,
}) => {
  const summary = `E2E attachment ${Date.now()}`
  e2eSummaries.add(summary)
  await selectRequester(page, 'Jennifer Anderson')
  const created = await createTicket(page, summary)
  await page.goto(`/tickets/${created.ticketId}`)

  const uploadResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/tickets/${created.ticketId}/attachments`) &&
      response.request().method() === 'POST',
  )
  await page.getByLabel('Attachment file').setInputFiles(pngFile('e2e-lifecycle.png'))
  const uploadResponse = await uploadResponsePromise
  expect(uploadResponse.status(), 'AC-29 attachment created').toBe(201)
  const uploadBody = (await uploadResponse.json()) as { data: { id: string } }
  const attachmentId = uploadBody.data.id

  await expect(page.getByRole('link', { name: 'Download e2e-lifecycle.png' })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download e2e-lifecycle.png' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename(), 'AC-31 download filename').toBe('e2e-lifecycle.png')

  await page.getByRole('button', { name: 'Remove e2e-lifecycle.png' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const reason = 'E2E replacement reason'
  await dialog.getByLabel('Removal reason').fill(reason)
  await dialog.getByRole('button', { name: 'Remove' }).click()

  await expect(page.getByText('Removed', { exact: true })).toBeVisible()
  await expect(page.getByText(reason, { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Download e2e-lifecycle.png' }),
  ).toHaveCount(0)

  const requesterId = await getRequesterId(request, 'Jennifer Anderson')
  const removedResponse = await request.get(
    `${API_BASE_URL}/api/attachments/${attachmentId}/download`,
    { headers: { 'X-Requester-Id': requesterId } },
  )
  expect(removedResponse.status(), 'AC-33 removed content status').toBe(410)
  const removedBody = (await removedResponse.json()) as {
    error: { code: string }
  }
  expect(removedBody.error.code, 'AC-33 removed content code').toBe('ATTACHMENT_REMOVED')
})
