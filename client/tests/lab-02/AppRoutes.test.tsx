// UI-06/UI-07 (#20). AC-06, AC-11; ui-spec §5.
// TDT-01 equivalence partition: the Create Ticket route must render inside the
// application shell with its route-specific breadcrumb.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/App.js'
import { RequesterProvider, STORAGE_KEY } from '../../src/context/RequesterContext.js'

const REQUESTER = {
  id: 'r-jennifer',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
}

const fetchMock = vi.fn((input: unknown) => {
  const url = String(input)
  if (url.endsWith('/api/requesters')) {
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: [REQUESTER] }) })
  }
  if (url.endsWith('/api/categories')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'category-hardware', name: 'Hardware' }] }),
    })
  }
  if (url.endsWith('/api/related-systems')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'system-email', name: 'Email' }] }),
    })
  }
  return Promise.reject(new Error(`Unexpected request: ${url}`))
})

beforeEach(() => {
  window.sessionStorage.clear()
  window.sessionStorage.setItem(STORAGE_KEY, REQUESTER.id)
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
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
