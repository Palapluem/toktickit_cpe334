// UI-06, UI-07. AC-35, FR-11; ui-spec §5.
// Navigation shows only destinations the role may reach — an unauthorised one
// is absent, not disabled. A disabled link tells the user something exists
// that they cannot have, which is information they did not need.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../src/api.js'
import { AppShell } from '../../src/components/AppShell.js'
import { SessionProvider } from '../../src/context/SessionContext.js'
import type { Role } from '../../src/api.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return { ...actual, fetchCurrentUser: vi.fn(), logout: vi.fn() }
})

const fetchCurrentUserMock = vi.mocked(api.fetchCurrentUser)
const logoutMock = vi.mocked(api.logout)

const NAME_FOR: Record<Role, string> = {
  REQUESTER: 'Jennifer Anderson',
  IT_STAFF: 'Patricia Evans',
  ADMINISTRATOR: 'Margaret Hale',
}

function userWith(role: Role) {
  return {
    id: `u-${role}`,
    displayName: NAME_FOR[role],
    email: 'someone@example.ac.th',
    role,
    mustChangePassword: false,
  }
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/tickets']}>
      <SessionProvider>
        <Routes>
          <Route path="/tickets" element={<AppShell />} />
          <Route path="/login" element={<p>Sign in screen</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UI-06 · AC-35 · the shell shows who is signed in and as what', () => {
  for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as Role[]) {
    it(`shows the name and a ${role} badge`, async () => {
      fetchCurrentUserMock.mockResolvedValue(userWith(role))
      renderShell()

      expect(await screen.findByText(NAME_FOR[role])).toBeInTheDocument()
      // Text, never colour alone (STY-019).
      expect(screen.getByText(role.replace('_', ' '))).toBeInTheDocument()
    })
  }

  it('offers Logout', async () => {
    fetchCurrentUserMock.mockResolvedValue(userWith('REQUESTER'))
    renderShell()

    expect(await screen.findByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('shows neither name nor badge when there is no session', async () => {
    fetchCurrentUserMock.mockRejectedValue(new Error('no session'))
    renderShell()

    expect(await screen.findByRole('link', { name: 'TokTickIT' })).toBeInTheDocument()
    expect(screen.queryByText(NAME_FOR.REQUESTER)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
  })
})

describe('UI-07 · FR-11 · each role sees only its own destinations', () => {
  const EXPECTED: Record<Role, { shown: string[]; hidden: string[] }> = {
    REQUESTER: {
      shown: ['My Tickets', 'Create Ticket'],
      hidden: ['Ticket Queue', 'User Management'],
    },
    IT_STAFF: {
      shown: ['Ticket Queue'],
      hidden: ['My Tickets', 'Create Ticket', 'User Management'],
    },
    ADMINISTRATOR: {
      shown: ['Ticket Queue', 'User Management'],
      hidden: ['My Tickets', 'Create Ticket'],
    },
  }

  for (const role of Object.keys(EXPECTED) as Role[]) {
    it(`shows ${role} exactly its permitted destinations`, async () => {
      fetchCurrentUserMock.mockResolvedValue(userWith(role))
      renderShell()
      await screen.findByText(NAME_FOR[role])

      for (const label of EXPECTED[role].shown) {
        expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
      }
      for (const label of EXPECTED[role].hidden) {
        expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
      }
    })
  }

  it('renders an unauthorised destination as absent, never as disabled', async () => {
    fetchCurrentUserMock.mockResolvedValue(userWith('REQUESTER'))
    renderShell()
    await screen.findByText(NAME_FOR.REQUESTER)

    const navigation = screen.getByRole('navigation', { name: 'Main' })
    expect(navigation).toHaveTextContent('My Tickets')
    expect(navigation).not.toHaveTextContent('User Management')
    expect(navigation.querySelector('[aria-disabled="true"]')).toBeNull()
  })
})

describe('UI-06 · AC-04 · Logout ends the session', () => {
  it('calls the API and returns to the sign-in screen', async () => {
    fetchCurrentUserMock.mockResolvedValue(userWith('REQUESTER'))
    logoutMock.mockResolvedValue({ loggedOut: true })
    renderShell()

    await userEvent.click(await screen.findByRole('button', { name: 'Logout' }))

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledOnce()
    })
    expect(await screen.findByText('Sign in screen')).toBeInTheDocument()
  })

  it('leaves the session ended even when the request fails', async () => {
    fetchCurrentUserMock.mockResolvedValue(userWith('REQUESTER'))
    logoutMock.mockRejectedValue(new Error('network'))
    renderShell()

    await userEvent.click(await screen.findByRole('button', { name: 'Logout' }))

    // Staying signed in on screen after the user asked to leave is the worse
    // failure: the server is the authority and will refuse the next request.
    expect(await screen.findByText('Sign in screen')).toBeInTheDocument()
  })
})
