// UI-06…UI-11 (#20). AC-06…AC-17; BR-18…BR-27.
// The tests use the network boundary and exercise the rendered states.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CreateTicket } from '../../src/screens/CreateTicket.js'
import {
  RequesterProvider,
  STORAGE_KEY,
} from '../../src/context/RequesterContext.js'

const REQUESTER = {
  id: 'r-jennifer',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
}

const CATEGORIES = [
  { id: 'category-hardware', name: 'Hardware' },
  { id: 'category-network', name: 'Network' },
]

const RELATED_SYSTEMS = [
  { id: 'system-email', name: 'Email' },
  { id: 'system-wifi', name: 'Campus Wi-Fi' },
]

const CREATED_TICKET = {
  id: 'ticket-1',
  ticketNo: 'TKT-2026-000001',
  createdAt: '2026-08-31T13:00:00.000Z',
  updatedAt: '2026-08-31T13:00:00.000Z',
  summary: 'Printer queue is stuck',
  description: 'Print jobs remain queued after restarting the printer.',
  requestedPriority: 'MEDIUM',
  itPriority: 'MEDIUM',
  status: 'NEW',
  requester: REQUESTER,
  category: CATEGORIES[0],
  relatedSystem: RELATED_SYSTEMS[0],
  owner: null,
  attachments: [],
  attachmentFailures: [],
}

type ApiResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function response(body: unknown, ok = true, status = 200): ApiResponse {
  return { ok, status, json: async () => body }
}

function mockApi(createResponse: ApiResponse | Promise<ApiResponse> = response({ data: CREATED_TICKET }, true, 201)) {
  const fetchMock = vi.fn((input: unknown, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/api/requesters')) {
      return Promise.resolve(response({ data: [REQUESTER] }))
    }
    if (url.endsWith('/api/categories')) {
      return Promise.resolve(response({ data: CATEGORIES }))
    }
    if (url.endsWith('/api/related-systems')) {
      return Promise.resolve(response({ data: RELATED_SYSTEMS }))
    }
    if (url.endsWith('/api/tickets') && init?.method === 'POST') {
      return Promise.resolve(createResponse)
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/tickets/new']}>
      <RequesterProvider>
        <CreateTicket />
      </RequesterProvider>
    </MemoryRouter>,
  )
}

async function waitForReferences() {
  await screen.findByRole('option', { name: 'Hardware' })
  await screen.findByRole('option', { name: 'Email' })
}

async function fillValidForm() {
  const user = userEvent.setup()
  await user.selectOptions(screen.getByLabelText(/^Category/), 'category-hardware')
  await user.selectOptions(
    screen.getByLabelText(/^Related System/),
    'system-email',
  )
  await user.selectOptions(
    screen.getByLabelText(/^Requested Priority/),
    'MEDIUM',
  )
  await user.type(screen.getByLabelText(/^Summary/), 'Printer queue is stuck')
  await user.type(
    screen.getByLabelText(/^Description/),
    'Print jobs remain queued after restarting the printer.',
  )
  return user
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.sessionStorage.setItem(STORAGE_KEY, REQUESTER.id)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-06/UI-07 · initial and reference states', () => {
  it('renders system-generated fields, selected requester, and reference options', async () => {
    mockApi()
    renderScreen()
    await waitForReferences()

    expect(screen.getByRole('heading', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ticket No.')).toHaveValue(
      'Generated after submission',
    )
    expect(screen.getByLabelText('Requester')).toHaveValue('Jennifer Anderson')
    expect(screen.getByLabelText('Current Status')).toHaveValue('New')
    expect(screen.getByLabelText('IT Priority')).toHaveValue('Set by IT Staff')
    expect(screen.getByRole('option', { name: 'Hardware' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Email' })).toBeInTheDocument()
  })

  it('disables classification and submit while references load', async () => {
    const pending = new Promise<ApiResponse>(() => {})
    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url.endsWith('/api/requesters')) {
        return Promise.resolve(response({ data: [REQUESTER] }))
      }
      return pending
    })
    vi.stubGlobal('fetch', fetchMock)
    renderScreen()

    expect(await screen.findByRole('status')).toHaveTextContent(/loading/i)
    expect(screen.getByLabelText(/^Category/)).toBeDisabled()
    expect(screen.getByLabelText(/^Related System/)).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeDisabled()
  })

  it('shows a safe reference failure and keeps submit disabled', async () => {
    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url.endsWith('/api/requesters')) {
        return Promise.resolve(response({ data: [REQUESTER] }))
      }
      return Promise.reject(new Error('reference service unavailable'))
    })
    vi.stubGlobal('fetch', fetchMock)
    renderScreen()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not load reference data/i,
    )
    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeDisabled()
  })
})

describe('UI-06 · AC-09/AC-10 · client validation', () => {
  it('shows field errors and does not call the create API', async () => {
    const fetchMock = mockApi()
    renderScreen()
    await waitForReferences()

    await userEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }))

    expect(await screen.findByText(/summary.*required/i)).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST'),
    ).toHaveLength(0)
  })
})

describe('UI-08 · AC-12 · submitting state', () => {
  it('disables the form and prevents a second request while in flight', async () => {
    let resolveCreate!: (value: ApiResponse) => void
    const pending = new Promise<ApiResponse>((resolve) => {
      resolveCreate = resolve
    })
    const fetchMock = mockApi(pending)
    renderScreen()
    await waitForReferences()
    const user = await fillValidForm()

    const submit = screen.getByRole('button', { name: 'Submit Ticket' })
    await user.click(submit)
    expect(await screen.findByRole('button', { name: /submitting/i })).toBeDisabled()
    expect(screen.getByLabelText(/^Summary/)).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /submitting/i }))
    expect(
      fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST'),
    ).toHaveLength(1)
    resolveCreate(response({ data: CREATED_TICKET }, true, 201))
  })
})

describe('UI-09 · AC-06 · successful creation', () => {
  it('shows the generated Ticket Number and next actions', async () => {
    mockApi()
    renderScreen()
    await waitForReferences()
    await fillValidForm()

    await userEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'TKT-2026-000001',
    )
    expect(screen.getByRole('link', { name: 'View Ticket' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Another' })).toBeInTheDocument()
  })
})

describe('UI-10 · AC-13/BR-25 · API failure', () => {
  it('shows a safe error and preserves every entered value', async () => {
    const fetchMock = mockApi(response({ error: { message: 'secret database detail' } }, false, 500))
    renderScreen()
    await waitForReferences()
    await fillValidForm()

    await userEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not create/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/secret database/i)
    expect(screen.getByLabelText(/^Summary/)).toHaveValue('Printer queue is stuck')
    expect(screen.getByLabelText(/^Description/)).toHaveValue(
      'Print jobs remain queued after restarting the printer.',
    )
    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeEnabled()
    expect(
      fetchMock.mock.calls.filter(([, init]) => (init as RequestInit)?.method === 'POST'),
    ).toHaveLength(1)
  })
})

describe('UI-11 · AC-16/AC-17 · invalid attachment', () => {
  it('names a rejected file and leaves the form usable', async () => {
    mockApi()
    renderScreen()
    await waitForReferences()
    const file = new File(['not permitted'], 'payload.exe', {
      type: 'application/octet-stream',
    })

    await userEvent.upload(
      screen.getByLabelText('Attachments', { selector: 'input' }),
      file,
      { applyAccept: false },
    )

    expect(await screen.findByText('payload.exe')).toBeInTheDocument()
    expect(screen.getByText(/permitted types/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Summary/)).toBeEnabled()
  })
})

describe('UI-06 · AC-07 · requester binding at the network boundary', () => {
  it('sends the selected requester header and never a requester body field', async () => {
    const fetchMock = mockApi()
    renderScreen()
    await waitForReferences()
    await fillValidForm()

    await userEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }))
    await screen.findByText('TKT-2026-000001')

    const createCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === 'POST',
    )
    expect(createCall).toBeDefined()
    const [, init] = createCall as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Requester-Id']).toBe(
      REQUESTER.id,
    )
    expect(JSON.parse(String(init.body))).not.toHaveProperty('requesterId')
  })
})
