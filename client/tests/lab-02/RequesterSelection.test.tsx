// UI-02, UI-03, UI-04 (#17). AC-02, AC-04, AC-05; ui-spec §6; BR-03, BR-10.
// TDT-01: loaded / empty / failed are the three classes the screen must handle.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SelectRequester } from '../../src/screens/SelectRequester.js'
import { RequesterProvider } from '../../src/context/RequesterContext.js'

const REQUESTERS = [
  { id: 'r-david', displayName: 'David Lee', email: 'david.lee@example.ac.th' },
  {
    id: 'r-jennifer',
    displayName: 'Jennifer Anderson',
    email: 'jennifer.anderson@example.ac.th',
  },
]

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({ ok, status, json: async () => body })
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/select-requester']}>
      <RequesterProvider>
        <SelectRequester />
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

describe('UI-02 · AC-02 · the selector lists active requesters', () => {
  it('loads them from the API', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderScreen()

    expect(
      await screen.findByRole('option', { name: 'Jennifer Anderson' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'David Lee' }),
    ).toBeInTheDocument()
  })

  // BR-03: this is a testing mechanism, and the screen has to say so.
  it('states plainly that it is not a login screen', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderScreen()

    expect(await screen.findByText(/not a login screen/i)).toBeInTheDocument()
  })

  it('renders the identity icon and both explanatory callouts', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderScreen()

    expect(await screen.findByRole('option', { name: 'David Lee' })).toBeInTheDocument()
    expect(document.querySelector('.requester-selection__intro-icon')).toBeInTheDocument()
    expect(document.querySelector('.requester-selection__callout--info')).toHaveTextContent(
      'Only active development requesters are shown.',
    )
    expect(document.querySelector('.requester-selection__callout--shield')).toHaveTextContent(
      /Authentication coming in Lab 3/i,
    )
  })

  it('disables Continue until a requester is chosen', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderScreen()

    const continueButton = await screen.findByRole('button', {
      name: /continue/i,
    })
    expect(continueButton).toBeDisabled()

    await userEvent.selectOptions(
      screen.getByLabelText(/development requester/i),
      'r-jennifer',
    )
    expect(continueButton).toBeEnabled()
  })

  it('shows a loading state before the requesters arrive', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderScreen()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })
})

describe('UI-04 · AC-05 · empty state', () => {
  it('explains that none are available and how to fix it', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: [] }))
    renderScreen()

    expect(await screen.findByText(/no active development requesters/i)).toBeInTheDocument()
    expect(screen.getByText(/seed/i)).toBeInTheDocument()
  })

  it('keeps Continue disabled', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: [] }))
    renderScreen()

    await screen.findByText(/no active development requesters/i)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })
})

describe('UI-03 · AC-04 · API failure is safe', () => {
  it('shows an error with a retry action', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false, 500))
    renderScreen()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })

  it('keeps Continue disabled', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false, 500))
    renderScreen()

    await screen.findByRole('alert')
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  // TC-008: the message a user sees must not carry internals.
  it('shows a safe message, not a raw status or stack', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false, 500))
    renderScreen()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).not.toMatch(/\bat .*:\d+:\d+/)
    expect(alert.textContent).not.toMatch(/fetch|localhost|3001/i)
  })

  it('refetches when Try again is activated', async () => {
    const fetchMock = mockFetch({}, false, 500)
    vi.stubGlobal('fetch', fetchMock)
    renderScreen()

    await screen.findByRole('alert')
    const callsBefore = fetchMock.mock.calls.length

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore),
    )
  })
})

describe('selection persists for the session (§11.20)', () => {
  it('stores only the identifier, in sessionStorage', async () => {
    vi.stubGlobal('fetch', mockFetch({ data: REQUESTERS }))
    renderScreen()

    await screen.findByRole('option', { name: 'Jennifer Anderson' })
    await userEvent.selectOptions(
      screen.getByLabelText(/development requester/i),
      'r-jennifer',
    )
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))

    // Only the identifier: name and email are refetched, so a renamed requester
    // is never displayed from a stale copy (§11.20).
    const stored = window.sessionStorage.getItem('toktickit.requesterId')
    expect(stored).toBe('r-jennifer')
    expect(stored).not.toMatch(/Jennifer|example\.ac\.th/)
  })
})
