// UI-01 (#17). AC-01, BR-12, §11.20.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireRequester } from '../../src/components/RequireRequester.js'
import { RequesterProvider } from '../../src/context/RequesterContext.js'

const REQUESTERS = [
  {
    id: 'r-jennifer',
    displayName: 'Jennifer Anderson',
    email: 'jennifer.anderson@example.ac.th',
  },
]

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({ ok, status, json: async () => body })
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RequesterProvider>
        <Routes>
          <Route path="/select-requester" element={<p>Selection screen</p>} />
          <Route
            path="/tickets"
            element={
              <RequireRequester>
                <p>My Tickets</p>
              </RequireRequester>
            }
          />
        </Routes>
      </RequesterProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-01 · BR-12 · ticket screens require a requester', () => {
  it('redirects to selection when nothing is chosen', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderAt('/tickets')

    expect(await screen.findByText('Selection screen')).toBeInTheDocument()
    expect(screen.queryByText('My Tickets')).not.toBeInTheDocument()
  })

  it('allows the screen through once a requester is stored', async () => {
    window.sessionStorage.setItem('toktickit.requesterId', 'r-jennifer')
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderAt('/tickets')

    expect(await screen.findByText('My Tickets')).toBeInTheDocument()
  })

  // §11.20. Reseeding regenerates UUIDs, so a stored id can refer to nothing.
  // Without this the user is bounced from every screen with no way to recover.
  it('clears a stored id that no longer matches an active requester', async () => {
    window.sessionStorage.setItem('toktickit.requesterId', 'r-deleted')
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderAt('/tickets')

    expect(await screen.findByText('Selection screen')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('toktickit.requesterId')).toBeNull()
  })

  it('does not flash the protected screen while validating', () => {
    window.sessionStorage.setItem('toktickit.requesterId', 'r-jennifer')
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderAt('/tickets')

    expect(screen.queryByText('My Tickets')).not.toBeInTheDocument()
    expect(screen.queryByText('Selection screen')).not.toBeInTheDocument()
  })
})
