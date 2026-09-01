// UI-06/UI-07 (#20). AC-06, AC-11; ui-spec §5.
// TDT-01 equivalence partition: the Create Ticket route must render inside the
// application shell with its route-specific breadcrumb.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/App.js'
import { RequesterProvider, STORAGE_KEY } from '../../src/context/RequesterContext.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return {
    ...actual,
    fetchRequesters: vi.fn(async () => [
      {
        id: 'r-jennifer',
        displayName: 'Jennifer Anderson',
        email: 'jennifer.anderson@example.ac.th',
      },
    ]),
    fetchCategories: vi.fn(async () => [
      { id: 'category-hardware', name: 'Hardware' },
    ]),
    fetchRelatedSystems: vi.fn(async () => [
      { id: 'system-email', name: 'Email' },
    ]),
  }
})

const REQUESTER = {
  id: 'r-jennifer',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.sessionStorage.setItem(STORAGE_KEY, REQUESTER.id)
})

describe('Create Ticket route shell contract', () => {
  it('renders the Create Ticket breadcrumb inside the application shell', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets/new']}>
        <RequesterProvider>
          <App />
        </RequesterProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent(
      'My Tickets › Create Ticket',
    )
  })
})
