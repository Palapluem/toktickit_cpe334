// UI-01, UI-02, UI-03. AC-01, AC-03; ui-spec §6.
// The failure message here is a requirement, not copy: it must not vary by
// cause and must not hint that the email was recognised (SEC-002).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../src/api.js'
import { Login } from '../../src/screens/Login.js'
import { SessionProvider } from '../../src/context/SessionContext.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return { ...actual, login: vi.fn(), fetchCurrentUser: vi.fn() }
})

const loginMock = vi.mocked(api.login)
const fetchCurrentUserMock = vi.mocked(api.fetchCurrentUser)

const REQUESTER = {
  id: 'u-1',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
  role: 'REQUESTER' as const,
  mustChangePassword: false,
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/tickets" element={<p>My Tickets screen</p>} />
          <Route path="/change-password" element={<p>Change password screen</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

async function signIn(email = REQUESTER.email, password = 'a-long-password') {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/^Email/), email)
  await user.type(screen.getByLabelText(/^Password/), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchCurrentUserMock.mockRejectedValue(new Error('no session'))
})

describe('UI-01 · AC-01 · a valid sign-in reaches the application', () => {
  it('sends the credentials the user typed', async () => {
    loginMock.mockResolvedValue(REQUESTER)
    renderLogin()
    await signIn()

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(REQUESTER.email, 'a-long-password')
    })
  })

  it('routes a ready user into the application', async () => {
    loginMock.mockResolvedValue(REQUESTER)
    renderLogin()
    await signIn()

    expect(await screen.findByText('My Tickets screen')).toBeInTheDocument()
  })

  it('routes a user with an initial password to Change Password (AC-02)', async () => {
    loginMock.mockResolvedValue({ ...REQUESTER, mustChangePassword: true })
    renderLogin()
    await signIn()

    expect(await screen.findByText('Change password screen')).toBeInTheDocument()
  })
})

describe('UI-02 · AC-03 · the failure message says one thing', () => {
  it('shows the safe message and no transport or account detail', async () => {
    loginMock.mockRejectedValue(new api.ApiRequestError('Sign in failed', [], 401, 'INVALID_CREDENTIALS'))
    renderLogin()
    await signIn()

    const callout = await screen.findByRole('alert')
    expect(callout).toHaveTextContent('Invalid email or password.')
    expect(callout).not.toHaveTextContent(/401|inactive|not found|exists/i)
    expect(callout).not.toHaveTextContent(REQUESTER.email)
  })

  it('says the same thing for an unknown email as for a wrong password', async () => {
    loginMock.mockRejectedValue(new api.ApiRequestError('Sign in failed', [], 401, 'INVALID_CREDENTIALS'))
    renderLogin()
    await signIn('nobody@example.ac.th')
    const unknown = (await screen.findByRole('alert')).textContent

    expect(unknown).toBeTruthy()
    expect(unknown).toContain('Invalid email or password.')
  })

  it('stays on the sign-in screen after a refusal', async () => {
    loginMock.mockRejectedValue(new api.ApiRequestError('Sign in failed', [], 401, 'INVALID_CREDENTIALS'))
    renderLogin()
    await signIn()

    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('My Tickets screen')).not.toBeInTheDocument()
  })
})

describe('UI-02 · field validation happens before the request', () => {
  it('refuses an empty form without calling the API', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('refuses a malformed email without calling the API', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText(/^Email/), 'not-an-email')
    await user.type(screen.getByLabelText(/^Password/), 'a-long-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })
})

describe('UI-03 · AC-01 · the busy state sends one request', () => {
  it('disables submit while the request is in flight', async () => {
    loginMock.mockReturnValue(new Promise(() => {}))
    renderLogin()
    await signIn()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /working|signing/i })).toBeDisabled()
    })
  })

  it('sends exactly one request however many times submit is clicked', async () => {
    loginMock.mockReturnValue(new Promise(() => {}))
    renderLogin()
    const user = await signIn()

    const button = screen.getByRole('button', { name: /working|signing/i })
    await user.click(button)
    await user.click(button)

    expect(loginMock).toHaveBeenCalledTimes(1)
  })
})

describe('UI-02 · the screen offers nothing it cannot deliver', () => {
  it('has no forgot-password link, because there is no password reset (§3)', async () => {
    renderLogin()

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /forgot/i })).not.toBeInTheDocument()
  })
})
