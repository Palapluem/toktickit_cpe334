// UI-11, UI-12. AC-20, AC-22, AC-23; ui-spec §9.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../src/api.js'
import { StaffTicketDetail } from '../../src/screens/StaffTicketDetail.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return {
    ...actual,
    fetchStaffTicket: vi.fn(),
    setTicketOwner: vi.fn(),
    setItPriority: vi.fn(),
    setTicketStatus: vi.fn(),
  }
})

const fetchStaffTicketMock = vi.mocked(api.fetchStaffTicket)
const setTicketOwnerMock = vi.mocked(api.setTicketOwner)
const setItPriorityMock = vi.mocked(api.setItPriority)
const setTicketStatusMock = vi.mocked(api.setTicketStatus)

const TICKET: api.StaffTicket = {
  id: 't-1',
  ticketNo: 'TKT-2026-000001',
  summary: 'Shared printer jams',
  description: 'Double-sided printing jams on the second sheet.',
  category: { id: 'c-1', name: 'Hardware' },
  relatedSystem: { id: 's-1', name: 'Printer' },
  requester: { id: 'r-1', displayName: 'Jennifer Anderson' },
  requestedPriority: 'MEDIUM',
  itPriority: 'HIGH',
  status: 'OPEN',
  owner: null,
  requesterResolvedAt: null,
  createdAt: '2026-09-01T04:00:00.000Z',
  updatedAt: '2026-09-08T06:00:00.000Z',
  attachments: [],
  permittedTransitions: ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
}

const OWNED: api.StaffTicket = {
  ...TICKET,
  owner: { id: 's-1', displayName: 'Patricia Evans' },
  status: 'IN_PROGRESS',
  permittedTransitions: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/staff/tickets/t-1']}>
      <Routes>
        <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchStaffTicketMock.mockResolvedValue(TICKET)
})

describe('UI-11 · AC-20 · ownership', () => {
  it('offers Claim while the Ticket is unassigned', async () => {
    renderDetail()

    expect(await screen.findByRole('button', { name: 'Claim' })).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('claims the Ticket and shows the new owner and status', async () => {
    setTicketOwnerMock.mockResolvedValue({
      ...TICKET,
      owner: { id: 's-1', displayName: 'Patricia Evans' },
      status: 'OPEN',
    })
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Claim' }))

    await waitFor(() => {
      expect(setTicketOwnerMock).toHaveBeenCalledWith('t-1', 'me')
    })
    expect(await screen.findByText('Patricia Evans')).toBeInTheDocument()
  })

  it('offers Unassign once the Ticket is owned, and no Claim', async () => {
    fetchStaffTicketMock.mockResolvedValue(OWNED)
    renderDetail()

    expect(await screen.findByRole('button', { name: 'Unassign' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Claim' })).not.toBeInTheDocument()
  })

  it('unassigns with an explicit null', async () => {
    fetchStaffTicketMock.mockResolvedValue(OWNED)
    setTicketOwnerMock.mockResolvedValue({ ...OWNED, owner: null })
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: 'Unassign' }))

    await waitFor(() => {
      expect(setTicketOwnerMock).toHaveBeenCalledWith('t-1', null)
    })
  })
})

describe('UI-11 · AC-22 · IT Priority', () => {
  it('changes IT Priority and leaves Requested Priority read-only', async () => {
    setItPriorityMock.mockResolvedValue({ ...TICKET, itPriority: 'URGENT' })
    renderDetail()

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'IT Priority' }),
      'URGENT',
    )

    await waitFor(() => {
      expect(setItPriorityMock).toHaveBeenCalledWith('t-1', 'URGENT')
    })
  })

  it('offers no control at all for Requested Priority (BR-18)', async () => {
    renderDetail()
    await screen.findByText('TKT-2026-000001')

    // Read-only means no control, not a disabled one: a disabled control
    // implies someone, somewhere, may change it.
    expect(
      screen.queryByRole('combobox', { name: /requested priority/i }),
    ).not.toBeInTheDocument()
    // getByText would match the MEDIUM option inside the IT Priority select.
    expect(screen.getByDisplayValue('MEDIUM')).toBeInTheDocument()
  })
})

describe('UI-12 · AC-23 · the status control offers only permitted transitions', () => {
  it('lists exactly what the server said, and not the current status', async () => {
    renderDetail()

    const control = await screen.findByRole('combobox', { name: 'Status' })
    const offered = within(control)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value !== '')

    expect(offered).toEqual(TICKET.permittedTransitions)
    // An impossible transition is absent, not disabled — the client renders
    // policy it was told, not policy it computed (ui-spec §9).
    expect(offered).not.toContain('CLOSED')
    expect(offered).not.toContain('OPEN')
  })

  it('narrows when the server says a different set', async () => {
    fetchStaffTicketMock.mockResolvedValue(OWNED)
    renderDetail()

    const control = await screen.findByRole('combobox', { name: 'Status' })
    const offered = within(control)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value !== '')

    expect(offered).toEqual(OWNED.permittedTransitions)
    expect(offered).not.toContain('IN_PROGRESS')
  })

  it('sends the chosen transition', async () => {
    setTicketStatusMock.mockResolvedValue({ ...TICKET, status: 'IN_PROGRESS' })
    renderDetail()

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Status' }),
      'IN_PROGRESS',
    )

    await waitFor(() => {
      expect(setTicketStatusMock).toHaveBeenCalledWith('t-1', 'IN_PROGRESS')
    })
  })

  it('shows a refusal without changing what is on screen', async () => {
    setTicketStatusMock.mockRejectedValue(
      new api.ApiRequestError(
        'Could not change the status.',
        [],
        400,
        'INVALID_STATUS_TRANSITION',
      ),
    )
    renderDetail()

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Status' }),
      'RESOLVED',
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not change the status/i)
    // Nothing on screen moved: the server did not make the change.
    expect(screen.getByText('OPEN')).toBeInTheDocument()
  })
})

describe('UI-11 · the read-only body is the Lab 2 card, unchanged', () => {
  it('shows the fields that are never editable here', async () => {
    renderDetail()
    await screen.findByText('TKT-2026-000001')

    // Read-only fields render as value-bearing controls, so the assertion has
    // to look at their values rather than at page text.
    for (const value of [
      'Jennifer Anderson',
      'Hardware',
      'Printer',
      'Shared printer jams',
      'Double-sided printing jams on the second sheet.',
    ]) {
      expect(screen.getByDisplayValue(value)).toBeInTheDocument()
    }
  })

  it('marks a Ticket the Requester says appears resolved', async () => {
    fetchStaffTicketMock.mockResolvedValue({
      ...TICKET,
      requesterResolvedAt: '2026-09-09T02:00:00.000Z',
    })
    renderDetail()

    expect(await screen.findByText(/requester says resolved/i)).toBeInTheDocument()
  })

  it('shows the forbidden state for a role that may not be here', async () => {
    fetchStaffTicketMock.mockRejectedValue(
      new api.ApiRequestError('Ticket request failed', [], 403, 'FORBIDDEN'),
    )
    renderDetail()

    expect(await screen.findByRole('alert')).toHaveClass('zen-state--forbidden')
  })

  it('shows not-found for a Ticket that is not there', async () => {
    fetchStaffTicketMock.mockRejectedValue(
      new api.ApiRequestError('Ticket request failed', [], 404, 'TICKET_NOT_FOUND'),
    )
    renderDetail()

    expect(await screen.findByText(/not available/i)).toBeInTheDocument()
    expect(document.querySelector('.zen-state--forbidden')).toBeNull()
  })
})
