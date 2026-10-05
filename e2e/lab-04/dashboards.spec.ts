// E2E-04/05 · RESP-01 · AC-26–AC-34 · independently compare dashboard metrics and follow their drill-downs.
import { execFileSync } from 'node:child_process'
import { expect, test } from '../lab-02/fixtures'
import {
  API_BASE_URL,
  captureLab4Screenshot,
  DEVELOPMENT_PASSWORD,
  expectNoPageOverflow,
} from '../lab-02/helpers'
import { getE2EDatabaseUrl } from '../lab-02/environment'

const STAFF_EMAIL = 'patricia.evans@example.ac.th'
const ADMIN_EMAIL = 'margaret.hale@example.ac.th'
const REQUESTER_EMAIL = 'jennifer.anderson@example.ac.th'
const ACTIVE = "'NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'"

async function signIn(page: import('@playwright/test').Page, email: string): Promise<void> {
  const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { email, password: DEVELOPMENT_PASSWORD },
  })
  expect(response.ok(), 'seeded account signs in').toBeTruthy()
}

async function signInThroughTheForm(page: import('@playwright/test').Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(DEVELOPMENT_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

function runSql(sql: string): number[] {
  const url = new URL(getE2EDatabaseUrl())
  const env = {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    ...(url.password ? { PGPASSWORD: decodeURIComponent(url.password) } : {}),
  }
  const output = execFileSync(
    'psql',
    ['--no-psqlrc', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', sql],
    { env, encoding: 'utf8' },
  ).trim()
  return output.split('|').map(Number)
}

async function compareStaffMetrics(page: import('@playwright/test').Page) {
  const response = await page.request.get(`${API_BASE_URL}/api/staff/dashboard`)
  expect(response.status()).toBe(200)
  const payload = (await response.json()).data
  const [unassigned, assignedToMe, urgent, waitingForRequester] = runSql(`
    SELECT
      COUNT(*) FILTER (WHERE "ownerId" IS NULL AND "status" IN (${ACTIVE})),
      COUNT(*) FILTER (WHERE "ownerId" = (SELECT "id" FROM "User" WHERE "email" = '${STAFF_EMAIL}') AND "status" IN (${ACTIVE})),
      COUNT(*) FILTER (WHERE "itPriority" = 'URGENT' AND "status" IN (${ACTIVE})),
      COUNT(*) FILTER (WHERE "status" = 'WAITING_FOR_REQUESTER')
    FROM "Ticket";
  `)
  expect(payload.metrics.unassigned.count).toBe(unassigned)
  expect(payload.metrics.assignedToMe.count).toBe(assignedToMe)
  expect(payload.metrics.urgent.count).toBe(urgent)
  expect(payload.metrics.waitingForRequester.count).toBe(waitingForRequester)
  return payload
}

async function compareRequesterMetrics(page: import('@playwright/test').Page) {
  const response = await page.request.get(`${API_BASE_URL}/api/requester/dashboard`)
  expect(response.status()).toBe(200)
  const payload = (await response.json()).data
  const [total, open, attention, resolved, closed] = runSql(`
    SELECT COUNT(*),
      COUNT(*) FILTER (WHERE "status" IN (${ACTIVE})),
      COUNT(*) FILTER (WHERE "status" = 'WAITING_FOR_REQUESTER'),
      COUNT(*) FILTER (WHERE "status" = 'RESOLVED'),
      COUNT(*) FILTER (WHERE "status" = 'CLOSED')
    FROM "Ticket"
    WHERE "requesterId" = (SELECT "id" FROM "User" WHERE "email" = '${REQUESTER_EMAIL}');
  `)
  expect(payload.totalTickets).toBe(total)
  expect(payload.metrics.open.count).toBe(open)
  expect(payload.metrics.needsAttention.count).toBe(attention)
  expect(payload.metrics.resolved.count).toBe(resolved)
  expect(payload.metrics.closed.count).toBe(closed)
  return payload
}

async function expectMetricColumns(page: import('@playwright/test').Page, width: number, columns: number) {
  await page.setViewportSize({ width, height: 900 })
  await expectNoPageOverflow(page)
  const actual = await page.locator('.zen-dashboard__metrics').evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
  )
  expect(actual, `metric grid at ${width}px`).toBe(columns)
}

test('E2E-04 · AC-32 · all roles land on their first Dashboard navigation item after sign-in', async ({ page }) => {
  for (const [email, route] of [
    [REQUESTER_EMAIL, '/dashboard'],
    [STAFF_EMAIL, '/staff/dashboard'],
    [ADMIN_EMAIL, '/staff/dashboard'],
  ] as const) {
    await signInThroughTheForm(page, email)
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}\/?$`))
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
    const navigation = page.getByRole('navigation', { name: 'Main' })
    await expect(navigation.getByRole('link').first()).toHaveText('Dashboard')
    await expect(navigation.getByRole('link', { name: 'Dashboard', exact: true }))
      .toHaveAttribute('aria-current', 'page')
    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  }
})

test('E2E-04 · AC-26–AC-29 · staff dashboard matches SQL and drills down to the same unassigned Tickets', async ({ page }) => {
  await signIn(page, STAFF_EMAIL)
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  const payload = await compareStaffMetrics(page)
  await expect(page.getByRole('heading', { name: 'My open Actions (2)' })).toBeVisible()
  await expect(page.locator('.zen-dashboard__status-list li')).toHaveCount(8)

  for (const [width, columns] of [[1280, 4], [834, 2], [390, 2], [767, 2], [768, 2], [991, 2], [992, 4]] as const) {
    await expectMetricColumns(page, width, columns)
    if (width === 1280) await captureLab4Screenshot(page, 'staff-dashboard', 'desktop.png')
    if (width === 834) await captureLab4Screenshot(page, 'staff-dashboard', 'tablet.png')
    if (width === 390) await captureLab4Screenshot(page, 'staff-dashboard', 'mobile.png')
  }

  const metricLink = page.getByRole('link', { name: new RegExp(`View ${payload.metrics.unassigned.count} unassigned tickets`) })
  await metricLink.click()
  await expect(page).toHaveURL(/\/staff\/tickets\?ownerId=unassigned&statusGroup=active/)
  await expect(page.getByText('Showing active Tickets', { exact: true })).toBeVisible()
  await expect(page.locator('#queue-owner')).toHaveValue('unassigned')
  const list = await page.request.get(`${API_BASE_URL}/api/staff/tickets?ownerId=unassigned&statusGroup=active`)
  expect(list.status()).toBe(200)
  expect((await list.json()).pagination.totalItems).toBe(payload.metrics.unassigned.count)
  await captureLab4Screenshot(page, 'staff-dashboard', 'drilldown-unassigned.png')
})

test('E2E-04 · AC-02, AC-26–AC-29 · Requester dashboard matches SQL and both metric links filter My Tickets', async ({ page }) => {
  await signIn(page, REQUESTER_EMAIL)
  await page.goto('/')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  const payload = await compareRequesterMetrics(page)

  for (const [width, columns] of [[1280, 4], [834, 2], [390, 2], [767, 2], [768, 2], [991, 2], [992, 4]] as const) {
    await expectMetricColumns(page, width, columns)
    if (width === 1280) await captureLab4Screenshot(page, 'requester-dashboard', 'desktop.png')
    if (width === 834) await captureLab4Screenshot(page, 'requester-dashboard', 'tablet.png')
    if (width === 390) await captureLab4Screenshot(page, 'requester-dashboard', 'mobile.png')
  }

  await page.getByRole('link', { name: new RegExp(`View ${payload.metrics.open.count} open tickets`) }).click()
  await expect(page).toHaveURL(/\/tickets\?statusGroup=active/)
  await expect(page.getByText('Showing active Tickets', { exact: true })).toBeVisible()
  const openList = await page.request.get(`${API_BASE_URL}/api/tickets?statusGroup=active`)
  expect(openList.status()).toBe(200)
  expect((await openList.json()).pagination.totalItems).toBe(payload.metrics.open.count)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await captureLab4Screenshot(page, 'requester-dashboard', 'drilldown-open.png')

  await page.goto('/dashboard')
  await page.getByRole('link', { name: new RegExp(`View ${payload.metrics.needsAttention.count} tickets? waiting for you`) }).click()
  await expect(page).toHaveURL(/\/tickets\?status=WAITING_FOR_REQUESTER/)
  const attentionList = await page.request.get(`${API_BASE_URL}/api/tickets?status=WAITING_FOR_REQUESTER`)
  expect(attentionList.status()).toBe(200)
  expect((await attentionList.json()).pagination.totalItems).toBe(payload.metrics.needsAttention.count)
  await captureLab4Screenshot(page, 'requester-dashboard', 'drilldown-needs-attention.png')

  await page.goto('/dashboard')
  await page.getByRole('link', { name: 'View all recently updated Tickets' }).click()
  await expect(page).toHaveURL(/\/tickets\?sort=updatedAt%3Adesc/)
  await expect(page.getByRole('button', { name: 'Sort by Last Updated' })).toHaveAttribute('aria-pressed', 'true')
})

test('E2E-04/05 · AC-29–AC-31 · zero, forbidden and recoverable failure states', async ({ page }) => {
  await signIn(page, ADMIN_EMAIL)
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'My open Actions (0)' })).toBeVisible()
  await captureLab4Screenshot(page, 'staff-dashboard', 'admin-no-open-actions.png')

  await signIn(page, REQUESTER_EMAIL)
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('alert')).toContainText('available to IT Staff and Administrators')
  await captureLab4Screenshot(page, 'staff-dashboard', 'forbidden-requester.png')

  await page.unrouteAll()
  await page.route('**/api/requester/dashboard', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable' } }) })
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await captureLab4Screenshot(page, 'requester-dashboard', 'failure-fixture.png')
  await page.unrouteAll()
  await page.route('**/api/requester/dashboard', (route) => route.continue())
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Your requests at a glance.', { exact: true })).toBeVisible()

  await page.unrouteAll()
  await page.route('**/api/requester/dashboard', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: {
      generatedAt: '2026-10-05T00:00:00.000Z', totalTickets: 0,
      metrics: {
        open: { count: 0, query: { statusGroup: 'active' } },
        needsAttention: { count: 0, query: { status: 'WAITING_FOR_REQUESTER' } },
        resolved: { count: 0, query: { status: 'RESOLVED' } },
        closed: { count: 0, query: { status: 'CLOSED' } },
      }, recentlyUpdated: [], recentlyUpdatedQuery: { sort: 'updatedAt:desc' },
    } }),
  }))
  await page.goto('/dashboard')
  await expect(page.getByText('You have not submitted any Tickets yet.')).toBeVisible()
  await captureLab4Screenshot(page, 'requester-dashboard', 'first-use-empty-fixture.png')
})

test('E2E-05 · AC-31 · staff dashboard loading and failure fixtures recover safely', async ({ page }) => {
  await signIn(page, STAFF_EMAIL)
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/staff/dashboard', async (route) => {
    await held
    await route.continue()
  })
  try {
    await page.goto('/staff/dashboard')
    await expect(page.getByText('Loading dashboard…')).toBeVisible()
    await captureLab4Screenshot(page, 'staff-dashboard', 'loading-fixture.png')
  } finally {
    release()
  }
  await expect(page.getByRole('heading', { name: 'My open Actions (2)' })).toBeVisible()
  await page.unrouteAll()

  let failOnce = true
  await page.route('**/api/staff/dashboard', async (route) => {
    if (failOnce) {
      failOnce = false
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Unavailable' } }) })
      return
    }
    await route.continue()
  })
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await captureLab4Screenshot(page, 'staff-dashboard', 'failure-fixture.png')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'My open Actions (2)' })).toBeVisible()
})

test('A11Y-01 · AC-35 · keyboard reaches a descriptive dashboard drill-down with visible focus', async ({ page }) => {
  await signIn(page, REQUESTER_EMAIL)
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  const link = page.getByRole('link', { name: /View \d+ open tickets/ })
  let reached = false
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press('Tab')
    if (await link.evaluate((element) => document.activeElement === element)) {
      reached = true
      break
    }
  }
  expect(reached, 'Tab order reaches the descriptive Open Tickets link').toBe(true)
  expect(await link.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  await captureLab4Screenshot(page, 'requester-dashboard', 'keyboard-drilldown-focus.png')
})
