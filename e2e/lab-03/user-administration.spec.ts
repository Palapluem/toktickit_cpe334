// Part 8 evidence for Issue #53: the list, create, edit, and both safety
// refusals. Margaret Hale is the only seeded Administrator, which is exactly
// the state the last-Administrator capture needs (server/src/seed/roster.ts).
import { expect, test } from '../lab-02/fixtures'
import {
  DEVELOPMENT_PASSWORD,
  captureLab3Screenshot,
  signOut,
} from '../lab-02/helpers'

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

async function signInThroughTheScreen(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function expectEmailValuesNotToBeClipped(
  page: import('@playwright/test').Page,
): Promise<void> {
  const layout = await page.locator('.user-management__table').evaluate((table) => {
    const cells = Array.from(
      table.querySelectorAll<HTMLTableCellElement>(
        'tbody td[data-label="Email"]',
      ),
    )
    const clipped = cells.some((cell) => {
      const cellBounds = cell.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(cell)
      return Array.from(range.getClientRects()).some(
        (rect) => rect.left < cellBounds.left - 1 || rect.right > cellBounds.right + 1,
      )
    })

    return {
      hasEmailCells:
        cells.length > 0 && cells.every((cell) => Boolean(cell.textContent?.trim())),
      clippedEmail: clipped,
      horizontalPageScroll:
        Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth ?? 0,
        ) > window.innerWidth,
    }
  })

  expect(layout, 'AC-34 / RESP-04: every email value must fit its list cell').toEqual({
    hasEmailCells: true,
    clippedEmail: false,
    horizontalPageScroll: false,
  })
}

test('ADMIN-01 · AC-34 captures the user list at three viewports', async ({ page }) => {
  await signIn(page, ADMIN)

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
    await expect(page.getByText('Jennifer Anderson')).toBeVisible()
    await expectEmailValuesNotToBeClipped(page)
    await captureLab3Screenshot(page, 'user-management', `${viewport.name}-list.png`)
    if (viewport.name === 'mobile') {
      await page.screenshot({
        path: 'artifacts/lab-03/screenshots/user-management/mobile-email-wrap.png',
      })
    }
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

test('ADMIN-04 edits a user, resets its password, and proves the next-login gate', async ({
  page,
}) => {
  await signIn(page, ADMIN)
  await page.setViewportSize(VIEWPORTS[0])
  await page.goto('/admin/users')

  const stamp = Date.now()
  const createdName = `E2E Editable ${stamp}`
  const editedName = `E2E Edited ${stamp}`
  const createdEmail = `e2e-editable-${stamp}@example.ac.th`
  const editedEmail = `e2e-edited-${stamp}@example.ac.th`
  const createdPassword = 'a-created-password'
  const resetPassword = `a-reset-password-${stamp}`
  const finalPassword = `a-final-password-${stamp}`

  await page.getByRole('button', { name: 'New User' }).click()
  const createDialog = page.getByRole('dialog')
  await createDialog.getByLabel('Name', { exact: false }).fill(createdName)
  await createDialog.getByLabel('Email', { exact: false }).fill(createdEmail)
  await createDialog.getByLabel('Role', { exact: false }).selectOption('REQUESTER')
  await createDialog
    .getByLabel('Initial password', { exact: false })
    .fill(createdPassword)
  await createDialog.getByRole('button', { name: 'Create User' }).click()
  await expect(createDialog).toHaveCount(0)

  const row = page.locator('tr', { hasText: createdName })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Edit' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Initial password', { exact: false })).toHaveCount(0)

  await dialog.getByLabel('Name', { exact: false }).fill(editedName)
  await dialog.getByLabel('Email', { exact: false }).fill(editedEmail)
  await dialog.getByLabel('Role', { exact: false }).selectOption('IT_STAFF')
  await captureLab3Screenshot(page, 'user-management', 'edit-dialog.png')
  await dialog.getByRole('button', { name: 'Save Changes' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText(editedName, { exact: true })).toBeVisible()

  const edited = await page.request.get(`${API}/api/admin/users`, {
    params: { search: editedEmail },
  })
  const editedBody = await edited.json()
  expect(editedBody.data).toHaveLength(1)
  expect(editedBody.data[0]).toMatchObject({
    displayName: editedName,
    email: editedEmail,
    role: 'IT_STAFF',
    isActive: true,
  })

  const editedRow = page.locator('tr', { hasText: editedName })
  await editedRow.getByRole('button', { name: 'Edit' }).click()
  const editedDialog = page.getByRole('dialog')
  await editedDialog.getByRole('button', { name: 'Set New Initial Password' }).click()
  const confirm = page.getByRole('dialog', { name: /new initial password/i })
  await expect(confirm).toContainText(/must change it at next login/i)

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/initial-password'),
  )
  await confirm
    .getByLabel('New initial password', { exact: false })
    .fill(resetPassword)
  await confirm.getByRole('button', { name: 'Save' }).click()
  const response = await responsePromise

  await expect(confirm).toContainText(/must change it at next login/i)
  await captureLab3Screenshot(page, 'user-management', 'reset-confirmation.png')
  // SEC-032: the password is never echoed back — checked against the actual
  // response, not the DOM, where the field the admin just typed into still
  // and correctly holds what they typed.
  expect(await response.text()).not.toContain(resetPassword)

  await confirm.getByRole('button', { name: 'Close' }).click()
  await signOut(page)

  await signInThroughTheScreen(page, editedEmail, resetPassword)
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  await captureLab3Screenshot(page, 'authentication', 'admin-created-change-password.png')

  await page.getByLabel('Current password').fill(resetPassword)
  await page.locator('#newPassword').fill(finalPassword)
  await page.locator('#confirmPassword').fill(finalPassword)
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page.getByRole('heading', { name: 'Ticket Queue' })).toBeVisible()
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
