// UI-05 (#17). AC-03, FR-04, FR-05; ui-spec §5.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '../../src/components/AppShell.js'
import { RequesterProvider } from '../../src/context/RequesterContext.js'

const REQUESTERS = [
  {
    id: 'r-jennifer',
    displayName: 'Jennifer Anderson',
    email: 'jennifer.anderson@example.ac.th',
  },
]

function mockFetch(body: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body })
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/tickets']}>
      <RequesterProvider>
        <Routes>
          <Route path="/select-requester" element={<p>Selection screen</p>} />
          <Route path="/tickets" element={<AppShell />} />
        </Routes>
      </RequesterProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.sessionStorage.setItem('toktickit.requesterId', 'r-jennifer')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-05 · AC-03 · the shell shows the current requester', () => {
  it('displays the selected requester by name', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderShell()

    expect(await screen.findByText('Jennifer Anderson')).toBeInTheDocument()
  })

  it('offers a Change Requester action', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderShell()

    expect(
      await screen.findByRole('button', { name: /change requester/i }),
    ).toBeInTheDocument()
  })
})

describe('FR-05, FR-06 · changing requester clears the context', () => {
  it('returns to selection and forgets the stored identifier', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderShell()

    await userEvent.click(
      await screen.findByRole('button', { name: /change requester/i }),
    )

    expect(await screen.findByText('Selection screen')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('toktickit.requesterId')).toBeNull()
  })
})
