// UI-15, UI-16. AC-28…AC-34; ui-spec §10.
// One screen, list plus a modal for create and edit — no pagination, no
// multi-column sort, no multiple filters (the labsheet's "not required" list
// is a specification here, not an omission).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../src/api.js'
import { UserManagement } from '../../src/screens/UserManagement.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return {
    ...actual,
    fetchUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    setUserInitialPassword: vi.fn(),
    fetchCurrentUser: vi.fn(),
  }
})

const fetchUsersMock = vi.mocked(api.fetchUsers)
const createUserMock = vi.mocked(api.createUser)
const updateUserMock = vi.mocked(api.updateUser)
const setPasswordMock = vi.mocked(api.setUserInitialPassword)
const fetchCurrentUserMock = vi.mocked(api.fetchCurrentUser)

const SELF: api.ManagedUser = {
  id: 'self-1',
  displayName: 'Margaret Hale',
  email: 'margaret.hale@example.ac.th',
  role: 'ADMINISTRATOR',
  isActive: true,
  mustChangePassword: false,
}

const OTHER: api.ManagedUser = {
  id: 'u-2',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
  role: 'REQUESTER',
  isActive: true,
  mustChangePassword: false,
}

const INACTIVE: api.ManagedUser = {
  id: 'u-3',
  displayName: 'Robert Wilson',
  email: 'robert.wilson@example.ac.th',
  role: 'REQUESTER',
  isActive: false,
  mustChangePassword: false,
}

function renderScreen() {
  return render(<UserManagement />)
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchCurrentUserMock.mockResolvedValue(SELF)
  fetchUsersMock.mockResolvedValue([SELF, OTHER, INACTIVE])
})

describe('UI-15 · AC-28 · the user list', () => {
  it('shows name, email, role, status, and an edit action per row', async () => {
    renderScreen()

    const row = (await screen.findByText('Jennifer Anderson')).closest('tr')!
    expect(within(row).getByText('jennifer.anderson@example.ac.th')).toBeInTheDocument()
    expect(within(row).getByText('REQUESTER')).toBeInTheDocument()
    expect(within(row).getByText('Active')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('shows Inactive for a deactivated user', async () => {
    renderScreen()

    const row = (await screen.findByText('Robert Wilson')).closest('tr')!
    expect(within(row).getByText('Inactive')).toBeInTheDocument()
  })

  it('searches by name or email', async () => {
    renderScreen()
    await screen.findByText('Jennifer Anderson')

    await userEvent.type(screen.getByLabelText('Search'), 'jennifer')

    await waitFor(() => {
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'jennifer' }),
      )
    })
  })

  it('filters by role', async () => {
    renderScreen()
    await screen.findByText('Jennifer Anderson')

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Role' }),
      'ADMINISTRATOR',
    )

    await waitFor(() => {
      expect(fetchUsersMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: 'ADMINISTRATOR' }),
      )
    })
  })

  it('offers no pagination, sort, or second filter control', async () => {
    renderScreen()
    await screen.findByText('Jennifer Anderson')

    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
    expect(screen.queryAllByRole('button', { name: /^sort/i })).toHaveLength(0)
  })
})

describe('UI-16 · AC-29 · creating a user', () => {
  it('opens a dialogue with Name, Email, Role, Active, and an initial password', async () => {
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: 'New User' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/^Name/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^Email/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^Role/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Active')).toBeChecked()
    expect(within(dialog).getByLabelText(/^Initial password/)).toBeInTheDocument()
  })

  it('submits the new user and closes the dialogue', async () => {
    createUserMock.mockResolvedValue({ ...OTHER, id: 'u-new', displayName: 'New Person' })
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: 'New User' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'New Person')
    await userEvent.type(within(dialog).getByLabelText(/^Email/), 'new.person@example.ac.th')
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Role/), 'IT_STAFF')
    await userEvent.type(
      within(dialog).getByLabelText(/^Initial password/),
      'a-long-initial-password',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create User' }))

    await waitFor(() => {
      expect(createUserMock).toHaveBeenCalledWith({
        displayName: 'New Person',
        email: 'new.person@example.ac.th',
        role: 'IT_STAFF',
        isActive: true,
        initialPassword: 'a-long-initial-password',
      })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('New Person')).toBeInTheDocument()
  })

  it('shows a duplicate-email conflict on the field', async () => {
    createUserMock.mockRejectedValue(
      new api.ApiRequestError(
        'The user could not be created.',
        [{ field: 'email', message: 'Choose a different email address.' }],
        409,
        'EMAIL_ALREADY_EXISTS',
      ),
    )
    renderScreen()
    await userEvent.click(await screen.findByRole('button', { name: 'New User' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Dup')
    await userEvent.type(within(dialog).getByLabelText(/^Email/), 'taken@example.ac.th')
    await userEvent.type(
      within(dialog).getByLabelText(/^Initial password/),
      'a-long-initial-password',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create User' }))

    expect(
      await within(dialog).findByText('Choose a different email address.'),
    ).toBeInTheDocument()
    // The dialogue stays open so the mistake can be corrected.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('UI-16 · AC-30 · editing a user', () => {
  it('opens with Name, Email, Role, and Active, and no password field', async () => {
    renderScreen()
    const row = (await screen.findByText('Jennifer Anderson')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/^Name/)).toHaveValue('Jennifer Anderson')
    expect(within(dialog).getByLabelText(/^Email/)).toHaveValue(
      'jennifer.anderson@example.ac.th',
    )
    expect(within(dialog).getByLabelText(/^Role/)).toHaveValue('REQUESTER')
    // Absent, not merely hidden: Edit has no initial-password field at all.
    expect(within(dialog).queryByLabelText(/^Initial password/)).toBeNull()
  })

  it('offers Set New Initial Password as a separate action with its own confirmation', async () => {
    renderScreen()
    const row = (await screen.findByText('Jennifer Anderson')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Set New Initial Password' }),
    )

    expect(
      await screen.findByText(/must change it at next login/i),
    ).toBeInTheDocument()
  })

  it('sets the password through its own endpoint and shows no password back', async () => {
    setPasswordMock.mockResolvedValue({ id: OTHER.id, mustChangePassword: true })
    renderScreen()
    const row = (await screen.findByText('Jennifer Anderson')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Set New Initial Password' }),
    )

    const confirmDialog = await screen.findByRole('dialog', { name: /new initial password/i })
    await userEvent.type(
      within(confirmDialog).getByLabelText(/^New initial password/),
      'a-fresh-initial-password',
    )
    await userEvent.click(within(confirmDialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(setPasswordMock).toHaveBeenCalledWith(OTHER.id, 'a-fresh-initial-password')
    })
    expect(updateUserMock).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('a-fresh-initial-password')
  })
})

describe('UI-16 · the two safety rules, as the interface presents them', () => {
  it('disables Active on the current user own row, with the reason stated', async () => {
    renderScreen()
    const row = (await screen.findByText('Margaret Hale')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))

    const dialog = await screen.findByRole('dialog')
    const active = within(dialog).getByLabelText('Active')
    expect(active).toBeDisabled()
    expect(dialog).toHaveTextContent('You cannot deactivate your own account.')
  })

  it('leaves Active enabled on every other row', async () => {
    renderScreen()
    const row = (await screen.findByText('Jennifer Anderson')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))

    expect(await screen.findByLabelText('Active')).toBeEnabled()
  })

  it('lets the attempt be made and shows the server last-Administrator refusal', async () => {
    updateUserMock.mockRejectedValue(
      new api.ApiRequestError(
        'The user could not be saved.',
        [],
        409,
        'LAST_ADMINISTRATOR',
      ),
    )
    renderScreen()
    const row = (await screen.findByText('Jennifer Anderson')).closest('tr')!
    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.selectOptions(within(dialog).getByLabelText(/^Role/), 'ADMINISTRATOR')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    // The client does not pre-compute this: the attempt reaches the server,
    // which is the only place the count can be trusted at submit time.
    expect(
      await within(dialog).findByText(/only active administrator/i),
    ).toBeInTheDocument()
  })
})

describe('UI-15 · every state renders', () => {
  it('shows loading feedback', async () => {
    fetchUsersMock.mockReturnValue(new Promise(() => {}))
    renderScreen()

    expect(await screen.findByRole('status')).toHaveTextContent(/loading/i)
  })

  it('shows the forbidden state for a role that may not be here', async () => {
    fetchUsersMock.mockRejectedValue(
      new api.ApiRequestError('Users request failed', [], 403, 'FORBIDDEN'),
    )
    renderScreen()

    expect(await screen.findByRole('alert')).toHaveClass('zen-state--forbidden')
  })

  it('shows a safe failure state with Try again', async () => {
    fetchUsersMock.mockRejectedValue(new Error('network'))
    renderScreen()

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
