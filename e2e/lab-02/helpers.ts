import fs from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { DEVELOPMENT_PASSWORD } from '../../server/src/seed/roster'

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

// Imported rather than restated: the password has one definition (SEC-033).
export { DEVELOPMENT_PASSWORD } from '../../server/src/seed/roster'

export const EMAIL_FOR: Record<string, string> = {
  'Jennifer Anderson': 'jennifer.anderson@example.ac.th',
  'Michael Brown': 'michael.brown@example.ac.th',
  'Sarah Johnson': 'sarah.johnson@example.ac.th',
  'David Lee': 'david.lee@example.ac.th',
}

/**
 * Replaces selectRequester. The session cookie is established through the API
 * on the page's own request context, so it reaches the browser (AC-15). The
 * Login screen that will drive this through the interface arrives with L3-6.
 */
export async function signIn(page: Page, name: string): Promise<void> {
  const email = EMAIL_FOR[name]
  expect(email, `no seeded account for ${name}`).toBeDefined()

  const login = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password: DEVELOPMENT_PASSWORD },
  })
  expect(login.ok(), `AC-01 login for ${name}`).toBeTruthy()

  await page.goto('/tickets')
  await expect(page.getByText(name)).toBeVisible()
}

/** Ends the session, so the next signIn starts from nothing. */
export async function signOut(page: Page): Promise<void> {
  await page.request.post(`${API_BASE_URL}/api/auth/logout`)
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

/** An API context already carrying a session, for calls made outside the page. */
export async function signedInRequest(
  request: APIRequestContext,
  name: string,
): Promise<APIRequestContext> {
  const email = EMAIL_FOR[name]
  expect(email, `no seeded account for ${name}`).toBeDefined()

  const login = await request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password: DEVELOPMENT_PASSWORD },
  })
  expect(login.ok(), `AC-01 login for ${name}`).toBeTruthy()
  return request
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

/**
 * Lab 3 captures live under artifacts/lab-03 (lab-03 ui-spec §12).
 *
 * These specs render the Lab 3 application now, so writing their output over
 * artifacts/lab-02 would overwrite a submitted Lab 2 deliverable with pictures
 * of a different application.
 */
export async function captureLab3Screenshot(
  page: Page,
  screen: string,
  filename: string,
): Promise<void> {
  await captureInto(page, 'lab-03', screen, filename)
}

async function captureInto(
  page: Page,
  lab: 'lab-02' | 'lab-03',
  screen: string,
  filename: string,
): Promise<void> {
  const outputPath = path.resolve(
    process.cwd(),
    'artifacts',
    lab,
    'screenshots',
    screen,
    filename,
  )
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  await page.screenshot({ path: outputPath, fullPage: true })
}
