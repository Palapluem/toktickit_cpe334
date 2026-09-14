// Part 5 evidence for Issue #49: the authentication screens at desktop and
// mobile, and the refusal capture ui-spec §12 names explicitly — a happy-path
// capture session will not produce it.
import { expect, test } from '../lab-02/fixtures'
import { DEVELOPMENT_PASSWORD, captureLab3Screenshot } from '../lab-02/helpers'

const DESKTOP = { width: 1280, height: 900 }
const MOBILE = { width: 390, height: 844 }

// The one seeded account left behind the must-change gate (see
// server/scripts/reset-seed-credentials.mjs).
const GATED_EMAIL = 'david.lee@example.ac.th'

async function signInThroughTheScreen(
  page: import('@playwright/test').Page,
  email: string,
  password = DEVELOPMENT_PASSWORD,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('AUTH-01 captures the sign-in screen at desktop and mobile', async ({ page }) => {
  for (const [name, viewport] of [
    ['desktop', DESKTOP],
    ['mobile', MOBILE],
  ] as const) {
    await page.setViewportSize(viewport)
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await captureLab3Screenshot(page, 'authentication', `login-${name}.png`)
  }
})

test('AUTH-02 refuses a wrong password with one safe message', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await signInThroughTheScreen(page, 'jennifer.anderson@example.ac.th', 'wrong-password')

  const callout = page.getByRole('alert')
  await expect(callout).toHaveText('Invalid email or password.')
  await captureLab3Screenshot(page, 'authentication', 'login-failure.png')

  // The same message for an account that does not exist at all (SEC-002).
  await signInThroughTheScreen(page, 'nobody@example.ac.th', 'wrong-password')
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
})

test('AUTH-03 signs in and reaches My Tickets', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await signInThroughTheScreen(page, 'jennifer.anderson@example.ac.th')

  await expect(page.getByRole('heading', { name: 'My Tickets', exact: true })).toBeVisible()
  await expect(page.getByText('Jennifer Anderson')).toBeVisible()
  // exact: the status filter offers WAITING_FOR_REQUESTER, which contains it.
  await expect(page.getByText('REQUESTER', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
})

test('AUTH-04 captures the mandatory Change Password screen', async ({ page }) => {
  await signInThroughTheScreen(page, GATED_EMAIL)
  // Settle on the redirect before resizing: a goto issued mid-navigation
  // races the client-side one the sign-in just started.
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()

  for (const [name, viewport] of [
    ['desktop', DESKTOP],
    ['mobile', MOBILE],
  ] as const) {
    await page.setViewportSize(viewport)
    await page.goto('/change-password')

    await expect(
      page.getByRole('heading', { name: 'Choose a new password' }),
    ).toBeVisible()
    // No navigation: there is nowhere else to go (ui-spec §7).
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
    await captureLab3Screenshot(page, 'authentication', `change-password-${name}.png`)
  }
})

test('AUTH-05 refuses every other route until the password is changed', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP)
  await signInThroughTheScreen(page, GATED_EMAIL)
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()

  await page.goto('/tickets')
  await expect(page).toHaveURL(/\/change-password$/)

  // The server refuses it too; the redirect is feedback, not the control.
  const refused = await page.request.get('http://127.0.0.1:3002/api/tickets')
  expect(refused.status()).toBe(403)
  expect((await refused.json()).error.code).toBe('PASSWORD_CHANGE_REQUIRED')
})

test('AUTH-06 logs out and cannot return without signing in again', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await signInThroughTheScreen(page, 'sarah.johnson@example.ac.th')
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.goto('/tickets')
  await expect(page).toHaveURL(/\/login$/)
})
