// UI-04. AC-02, AC-12; ui-spec §7.
// The client redirect is feedback. The server's refusal is the control
// (SEC-016) — these tests cover the feedback half only.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../src/api.js'
import { RequireSession } from '../../src/components/RequireSession.js'
import { SessionProvider } from '../../src/context/SessionContext.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return { ...actual, fetchCurrentUser: vi.fn() }
})

const fetchCurrentUserMock = vi.mocked(api.fetchCurrentUser)

const READY = {
  id: 'u-1',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
  role: 'REQUESTER' as const,
  mustChangePassword: false,
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <Routes>
          <Route
            path="/tickets"
            element={
              <RequireSession>
                <p>My Tickets screen</p>
              </RequireSession>
            }
          />
          <Route path="/login" element={<p>Sign in screen</p>} />
          <Route path="/change-password" element={<p>Change password screen</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UI-04 · AC-12 · an unauthenticated visitor is sent to sign in', () => {
  it('redirects rather than rendering the protected screen', async () => {
    fetchCurrentUserMock.mockRejectedValue(new Error('no session'))
    renderAt('/tickets')

    expect(await screen.findByText('Sign in screen')).toBeInTheDocument()
    expect(screen.queryByText('My Tickets screen')).not.toBeInTheDocument()
  })

  it('renders nothing protected while the session is still resolving', () => {
    fetchCurrentUserMock.mockReturnValue(new Promise(() => {}))
    renderAt('/tickets')

    // A screen that flashes before the redirect has already shown what it
    // was guarding.
    expect(screen.queryByText('My Tickets screen')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign in screen')).not.toBeInTheDocument()
  })
})

describe('UI-04 · AC-02 · the must-change gate redirects every other route', () => {
  it('sends a user with an initial password to Change Password', async () => {
    fetchCurrentUserMock.mockResolvedValue({ ...READY, mustChangePassword: true })
    renderAt('/tickets')

    expect(await screen.findByText('Change password screen')).toBeInTheDocument()
    expect(screen.queryByText('My Tickets screen')).not.toBeInTheDocument()
  })

  it('lets the same user through once the password is changed', async () => {
    fetchCurrentUserMock.mockResolvedValue(READY)
    renderAt('/tickets')

    expect(await screen.findByText('My Tickets screen')).toBeInTheDocument()
  })
})
