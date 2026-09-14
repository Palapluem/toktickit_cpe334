// UI-05 (#17), migrated in #48. AC-03 becomes "the shell shows the authenticated
// user"; the Change Requester action is gone with the selector (AC-15), and
// Logout arrives with L3-6.
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '../../src/components/AppShell.js'
import { SessionProvider } from '../../src/context/SessionContext.js'

const USER = {
  id: 'r-jennifer',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
  role: 'REQUESTER',
  mustChangePassword: false,
}

function mockFetch(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 401,
    json: async () => body,
  })
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/tickets']}>
      <SessionProvider>
        <Routes>
          <Route path="/tickets" element={<AppShell />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-05 · AC-03 · the shell shows the authenticated user', () => {
  it('displays the name the server reports', async () => {
    vi.stubGlobal('fetch', mockFetch(true, { data: USER }))
    renderShell()

    expect(await screen.findByText('Jennifer Anderson')).toBeInTheDocument()
  })

  it('takes the name from the server rather than from anything stored', async () => {
    window.sessionStorage.setItem('toktickit.requesterId', 'someone-else')
    vi.stubGlobal('fetch', mockFetch(true, { data: USER }))
    renderShell()

    expect(await screen.findByText('Jennifer Anderson')).toBeInTheDocument()
    window.sessionStorage.clear()
  })
})

describe('AC-15 · the Change Requester action is gone', () => {
  it('offers no way to become a different user', async () => {
    vi.stubGlobal('fetch', mockFetch(true, { data: USER }))
    renderShell()

    // The positive control: the shell did render, so a missing button is not
    // just a component that failed to mount.
    expect(await screen.findByText('Jennifer Anderson')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /change requester/i }),
    ).not.toBeInTheDocument()
  })
})

describe('AC-12 · no session, no name', () => {
  it('shows no user when the server refuses', async () => {
    vi.stubGlobal('fetch', mockFetch(false, { error: { code: 'AUTHENTICATION_REQUIRED' } }))
    renderShell()

    expect(await screen.findByRole('link', { name: 'TokTickIT' })).toBeInTheDocument()
    expect(screen.queryByText('Jennifer Anderson')).not.toBeInTheDocument()
  })
})
