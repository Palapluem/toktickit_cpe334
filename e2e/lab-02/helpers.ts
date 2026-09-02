import fs from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const API_BASE_URL = 'http://127.0.0.1:3002'

export const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

export function pngFile(filename: string) {
  return {
    name: filename,
    mimeType: 'image/png',
    buffer: Buffer.from(ONE_PIXEL_PNG, 'base64'),
  }
}

export async function selectRequester(page: Page, name: string): Promise<void> {
  await page.goto('/select-requester')
  const requester = page.getByLabel('Development Requester*')
  await expect(requester).toBeVisible()
  await requester.selectOption({ label: name })
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/tickets$/)
  await expect(page.getByRole('button', { name: 'Change Requester' })).toBeVisible()
}

export async function createTicket(
  page: Page,
  summary: string,
  attachmentFilename?: string,
): Promise<{ ticketId: string; ticketNumber: string }> {
  await page.goto('/tickets/new')
  await expect(page.getByRole('heading', { name: 'Create Ticket' })).toBeVisible()
  await page.getByLabel('Category').selectOption({ label: 'Hardware' })
  await page.getByLabel('Related System').selectOption({ label: 'Printer' })
  await page.getByLabel('Requested Priority').selectOption({ label: 'HIGH' })
  await page.getByLabel('Summary').fill(summary)
  await page
    .getByLabel('Description')
    .fill('The device stopped responding during a normal support task.')

  if (attachmentFilename) {
    await page.locator('input[type=file]').setInputFiles(pngFile(attachmentFilename))
    await expect(page.getByText(attachmentFilename, { exact: true })).toBeVisible()
  }

  await page.getByRole('button', { name: 'Submit Ticket' }).click()
  const success = page.getByRole('alert').filter({ hasText: 'Ticket created' })
  await expect(success).toBeVisible()
  const successText = (await success.textContent()) ?? ''
  const ticketNumber = successText.match(/TKT-\d{4}-\d{6}/)?.[0]
  expect(ticketNumber, 'AC-06 official Ticket Number').toBeDefined()

  const href = await page.getByRole('link', { name: 'View Ticket' }).getAttribute('href')
  const ticketId = href?.split('/').pop()
  expect(ticketId, 'AC-06 View Ticket identifier').toBeDefined()

  return { ticketId: ticketId!, ticketNumber: ticketNumber! }
}

export async function getRequesterId(
  request: APIRequestContext,
  displayName: string,
): Promise<string> {
  const response = await request.get(`${API_BASE_URL}/api/requesters`)
  expect(response.ok(), 'FR-01 requester reference response').toBeTruthy()
  const body = (await response.json()) as {
    data: Array<{ id: string; displayName: string }>
  }
  const requester = body.data.find((item) => item.displayName === displayName)
  expect(requester, `FR-01 requester ${displayName}`).toBeDefined()
  return requester!.id
}

export async function expectNoPageOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    ),
  }))
  expect(
    metrics.documentWidth,
    `AC-35 page width ${metrics.documentWidth} must fit viewport ${metrics.viewportWidth}`,
  ).toBeLessThanOrEqual(metrics.viewportWidth)
}

export async function captureScreenshot(
  page: Page,
  screen: 'create-ticket' | 'my-tickets' | 'ticket-detail',
  filename: string,
): Promise<void> {
  const outputPath = path.resolve(
    process.cwd(),
    'artifacts',
    'lab-02',
    'screenshots',
    screen,
    filename,
  )
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  await page.screenshot({ path: outputPath, fullPage: true })
}
