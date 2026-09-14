// Part 8 evidence for Issue #53: the list, create, edit, and both safety
// refusals. Margaret Hale is the only seeded Administrator, which is exactly
// the state the last-Administrator capture needs (server/src/seed/roster.ts).
import { expect, test } from '../lab-02/fixtures'
import { DEVELOPMENT_PASSWORD, captureLab3Screenshot } from '../lab-02/helpers'

const API = 'http://127.0.0.1:3002'

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
] as const

const ADMIN = 'margaret.hale@example.ac.th'
const REQUESTER = 'jennifer.anderson@example.ac.th'

async function signIn(
  page: import('@playwright/test').Page,
  email: string,
): Promise<void> {
  const login = await page.request.post(`${API}/api/auth/login`, {
    data: { email, password: DEVELOPMENT_PASSWORD },
  })
  expect(login.ok(), `login for ${email}`).toBeTruthy()
}

test('ADMIN-01 captures the user list at three viewports', async ({ page }) => {
  await signIn(page, ADMIN)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
    await expect(page.getByText('Jennifer Anderson')).toBeVisible()
    await captureLab3Screenshot(page, 'user-management', `${viewport.name}-list.png`)
  }
})

test('ADMIN-02 captures the create dialogue and creates a user', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/admin/users')

  await page.getByRole('button', { name: 'New User' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await captureLab3Screenshot(page, 'user-management', 'create-dialog.png')

  const stamp = Date.now()
  await dialog.getByLabel('Name', { exact: false }).fill(`E2E Created ${stamp}`)
  await dialog
    .getByLabel('Email', { exact: false })
    .fill(`e2e-created-${stamp}@example.ac.th`)
  await dialog.getByLabel('Role', { exact: false }).selectOption('IT_STAFF')
  await dialog.getByLabel('Initial password', { exact: false }).fill('a-created-password')
  await dialog.getByRole('button', { name: 'Create User' }).click()

  await expect(dialog).toHaveCount(0)
  await expect(page.getByText(`E2E Created ${stamp}`)).toBeVisible()

  const created = await page.request.get(`${API}/api/admin/users`, {
    params: { search: `e2e-created-${stamp}` },
  })
  const body = await created.json()
  expect(body.data[0].mustChangePassword).toBe(true)
})

test('ADMIN-03 captures the duplicate-email conflict', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/admin/users')

  await page.getByRole('button', { name: 'New User' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill('Duplicate Attempt')
  await dialog.getByLabel('Email', { exact: false }).fill(REQUESTER)
  await dialog.getByLabel('Initial password', { exact: false }).fill('a-created-password')
  await dialog.getByRole('button', { name: 'Create User' }).click()

  await expect(dialog.getByText('Choose a different email address.')).toBeVisible()
  await captureLab3Screenshot(page, 'user-management', 'duplicate-email.png')
})

test('ADMIN-04 edits a user and sets a new initial password', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/admin/users')

  const row = page.locator('tr', { hasText: 'Jennifer Anderson' })
  await row.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Initial password', { exact: false })).toHaveCount(0)

  await dialog.getByRole('button', { name: 'Set New Initial Password' }).click()
  const confirm = page.getByRole('dialog', { name: /new initial password/i })
  await expect(confirm).toContainText(/must change it at next login/i)

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/initial-password'),
  )
  await confirm.getByLabel('New initial password', { exact: false }).fill('a-replaced-password')
  await confirm.getByRole('button', { name: 'Save' }).click()
  const response = await responsePromise

  await expect(page.getByText(/must change it at next login/i)).toBeVisible()
  // SEC-032: the password is never echoed back — checked against the actual
  // response, not the DOM, where the field the admin just typed into still
  // and correctly holds what they typed.
  expect(await response.text()).not.toContain('a-replaced-password')
})

test('ADMIN-05 captures self-deactivation disabled with its reason', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/admin/users')

  const row = page.locator('tr', { hasText: 'Margaret Hale' })
  await row.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')

  const active = dialog.getByLabel('Active', { exact: true })
  await expect(active).toBeDisabled()
  await expect(dialog).toContainText('You cannot deactivate your own account.')
  await captureLab3Screenshot(page, 'user-management', 'self-deactivation-refused.png')

  // The disabled control is feedback; the server's refusal is the control.
  const self = await page.request.get(`${API}/api/auth/me`)
  const selfId = (await self.json()).data.id
  const direct = await page.request.patch(`${API}/api/admin/users/${selfId}`, {
    data: { isActive: false },
  })
  expect(direct.status()).toBe(403)
  expect((await direct.json()).error.code).toBe('CANNOT_DEACTIVATE_SELF')
})

test('ADMIN-06 captures the last-Administrator refusal', async ({ page }) => {
  await signIn(page, ADMIN)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/admin/users')

  // Margaret is seeded as the only active Administrator, so demoting her own
  // role (not deactivating — CANNOT_DEACTIVATE_SELF checks isActive alone)
  // reaches LAST_ADMINISTRATOR directly.
  const row = page.locator('tr', { hasText: 'Margaret Hale' })
  await row.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')

  await dialog.getByLabel('Role', { exact: false }).selectOption('IT_STAFF')
  await dialog.getByRole('button', { name: 'Save Changes' }).click()

  await expect(dialog.getByText(/only active administrator/i)).toBeVisible()
  await captureLab3Screenshot(page, 'user-management', 'last-administrator.png')

  // The role was not actually changed.
  const stored = await page.request.get(`${API}/api/admin/users`, {
    params: { search: 'margaret' },
  })
  expect((await stored.json()).data[0].role).toBe('ADMINISTRATOR')
})
