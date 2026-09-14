// UI-06/UI-07 (#20). AC-06, AC-11; ui-spec §5; TDT-01 route-shell partition.
// Migrated in #48: the selection route is gone with the selector (AC-15).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/App.js'
import { SessionProvider } from '../../src/context/SessionContext.js'

const USER = {
  id: 'r-jennifer',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
  role: 'REQUESTER' as const,
  mustChangePassword: false,
}

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return {
    ...actual,
    fetchCurrentUser: vi.fn(async () => USER),
    fetchCategories: vi.fn(async () => [
      { id: 'category-hardware', name: 'Hardware' },
    ]),
    fetchRelatedSystems: vi.fn(async () => [
      { id: 'system-email', name: 'Email' },
    ]),
  }
})

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('Create Ticket route shell contract', () => {
  it('renders the Create Ticket breadcrumb inside the application shell', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets/new']}>
        <SessionProvider>
          <App />
        </SessionProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent(
      'My Tickets › Create Ticket',
    )
  })
})
