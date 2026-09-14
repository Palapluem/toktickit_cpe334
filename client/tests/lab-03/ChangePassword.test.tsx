// UI-04, UI-05. AC-02, AC-05, AC-06; ui-spec §7.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../src/api.js'
import { ChangePassword } from '../../src/screens/ChangePassword.js'
import { SessionProvider } from '../../src/context/SessionContext.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return { ...actual, changePassword: vi.fn(), fetchCurrentUser: vi.fn() }
})

const changePasswordMock = vi.mocked(api.changePassword)
const fetchCurrentUserMock = vi.mocked(api.fetchCurrentUser)

const MUST_CHANGE = {
  id: 'u-1',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
  role: 'REQUESTER' as const,
  mustChangePassword: true,
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/change-password']}>
      <SessionProvider>
        <Routes>
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/tickets" element={<p>My Tickets screen</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

/** The error attached to a field, rather than any text that happens to match. */
async function fieldError(label: RegExp): Promise<string> {
  const field = await screen.findByLabelText(label)
  const describedBy = field.getAttribute('aria-describedby') ?? ''
  const message = describedBy
    .split(' ')
    .map((id) => document.getElementById(id))
    .find((element) => element?.classList.contains('zen-field__error'))
  return message?.textContent ?? ''
}

async function fill(current: string, next: string, confirm = next) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/^Current password/), current)
  await user.type(screen.getByLabelText(/^New password/), next)
  await user.type(screen.getByLabelText(/^Confirm new password/), confirm)
  await user.click(screen.getByRole('button', { name: 'Save and continue' }))
  return user
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchCurrentUserMock.mockResolvedValue(MUST_CHANGE)
})

describe('UI-05 · the rule is stated before the user types (AC-06)', () => {
  it('shows the minimum length as a hint, not only as a failure', async () => {
    renderScreen()

    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains why the screen is being shown', async () => {
    renderScreen()

    expect(await screen.findByText(/initial password/i)).toBeInTheDocument()
  })
})

describe('UI-05 · AC-06 · validation refuses before the request', () => {
  it('refuses a new password below the minimum length', async () => {
    renderScreen()
    await fill('current-password', 'short')

    await waitFor(async () => {
      expect(await fieldError(/^New password/)).toMatch(/at least 10 characters/i)
    })
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('refuses a mismatched confirmation', async () => {
    renderScreen()
    await fill('current-password', 'a-long-password', 'a-different-password')

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('refuses a new password identical to the current one', async () => {
    renderScreen()
    await fill('a-long-password', 'a-long-password')

    expect(await screen.findByText(/different from/i)).toBeInTheDocument()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('accepts one at the minimum length', async () => {
    changePasswordMock.mockResolvedValue({ passwordChanged: true })
    renderScreen()
    await fill('current-password', '0123456789')

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith('current-password', '0123456789')
    })
  })
})

describe('UI-04 · AC-05 · a wrong current password is a field message', () => {
  it('reports it on the field rather than as a page banner', async () => {
    changePasswordMock.mockRejectedValue(
      new api.ApiRequestError('Password change failed', [], 401, 'INVALID_CREDENTIALS'),
    )
    renderScreen()
    await fill('wrong-current', 'a-long-password')

    const field = await screen.findByLabelText(/^Current password/)
    const errorId = field.getAttribute('aria-describedby')
    expect(errorId).toBeTruthy()
    expect(document.getElementById(errorId!.split(' ')[0])).toHaveTextContent(
      /incorrect/i,
    )
  })

  it('reports a server field error against the field it names', async () => {
    changePasswordMock.mockRejectedValue(
      new api.ApiRequestError(
        'Password change failed',
        [{ field: 'newPassword', message: 'New password must be at least 10 characters.' }],
        400,
        'VALIDATION_FAILED',
      ),
    )
    renderScreen()
    await fill('current-password', 'a-long-password')

    expect(
      await screen.findByText('New password must be at least 10 characters.'),
    ).toBeInTheDocument()
  })
})

describe('UI-04 · AC-02 · success leaves the screen', () => {
  it('routes to the role home once the password is saved', async () => {
    changePasswordMock.mockResolvedValue({ passwordChanged: true })
    fetchCurrentUserMock
      .mockResolvedValueOnce(MUST_CHANGE)
      .mockResolvedValue({ ...MUST_CHANGE, mustChangePassword: false })
    renderScreen()
    await fill('current-password', 'a-long-password')

    expect(await screen.findByText('My Tickets screen')).toBeInTheDocument()
  })
})

describe('UI-04 · the busy state sends one request', () => {
  it('disables submit while the request is in flight', async () => {
    changePasswordMock.mockReturnValue(new Promise(() => {}))
    renderScreen()
    await fill('current-password', 'a-long-password')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /working|saving/i })).toBeDisabled()
    })
    expect(changePasswordMock).toHaveBeenCalledTimes(1)
  })
})
