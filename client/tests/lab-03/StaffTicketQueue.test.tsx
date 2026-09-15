// UI-08, UI-09, UI-10, UI-18. AC-18, AC-19, AC-36, FR-36; ui-spec §8.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../src/api.js'
import { StaffTicketQueue } from '../../src/screens/StaffTicketQueue.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return { ...actual, fetchStaffQueue: vi.fn() }
})

const fetchStaffQueueMock = vi.mocked(api.fetchStaffQueue)

const CATEGORIES = [
  { id: 'category-hardware', name: 'Hardware' },
  { id: 'category-network', name: 'Network' },
]

const ASSIGNED: api.StaffQueueRow = {
  id: 't-1',
  ticketNo: 'TKT-2026-000001',
  summary: 'Shared printer jams',
  category: CATEGORIES[0],
  requester: { id: 'r-1', displayName: 'Jennifer Anderson' },
  requestedPriority: 'MEDIUM',
  itPriority: 'URGENT',
  status: 'IN_PROGRESS',
  owner: { id: 's-1', displayName: 'Patricia Evans' },
  requesterResolvedAt: null,
  createdAt: '2026-09-01T04:00:00.000Z',
  updatedAt: '2026-09-08T06:00:00.000Z',
}

const UNASSIGNED: api.StaffQueueRow = {
  ...ASSIGNED,
  id: 't-2',
  ticketNo: 'TKT-2026-000002',
  summary: 'VPN disconnects',
  itPriority: 'LOW',
  status: 'NEW',
  owner: null,
  requesterResolvedAt: '2026-09-09T02:00:00.000Z',
}

function queueResponse(
  rows: api.StaffQueueRow[],
  overrides: Partial<api.StaffQueueResponse> = {},
): api.StaffQueueResponse {
  return {
    data: rows,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: rows.length,
      totalPages: rows.length > 0 ? 1 : 0,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    appliedFilters: {
      search: null,
      status: null,
      itPriority: null,
      categoryId: null,
      ownerId: null,
      sort: 'itPriority:desc',
    },
    ...overrides,
  }
}

function renderQueue() {
  return render(
    <MemoryRouter initialEntries={['/staff/tickets']}>
      <StaffTicketQueue />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchStaffQueueMock.mockResolvedValue(queueResponse([ASSIGNED, UNASSIGNED]))
})

describe('UI-08 · AC-18 · the queue shows ownership and status', () => {
  it('renders a row per Ticket with the columns ui-spec §8 chose', async () => {
    renderQueue()

    expect(await screen.findByText('TKT-2026-000001')).toBeInTheDocument()
    const row = screen.getByText('Shared printer jams').closest('tr')!
    expect(within(row).getByText('Jennifer Anderson')).toBeInTheDocument()
    expect(within(row).getByText('URGENT')).toBeInTheDocument()
    expect(within(row).getByText('IN_PROGRESS')).toBeInTheDocument()
    expect(within(row).getByText('Patricia Evans')).toBeInTheDocument()
  })

  it('shows Unassigned rather than an empty cell', async () => {
    renderQueue()

    // An empty cell reads as a loading failure (ui-spec §8).
    const row = (await screen.findByText('VPN disconnects')).closest('tr')!
    expect(within(row).getByText('Unassigned')).toBeInTheDocument()
  })

  it('marks a Ticket the Requester says appears resolved', async () => {
    renderQueue()

    const resolved = (await screen.findByText('VPN disconnects')).closest('tr')!
    const notResolved = screen.getByText('Shared printer jams').closest('tr')!
    expect(within(resolved).getByText(/requester says resolved/i)).toBeInTheDocument()
    expect(within(notResolved).queryByText(/requester says resolved/i)).toBeNull()
  })

  it('offers a way to open each Ticket', async () => {
    renderQueue()

    expect(
      await screen.findByRole('link', { name: 'TKT-2026-000001' }),
    ).toHaveAttribute('href', '/staff/tickets/t-1')
  })

  it('labels every cell, so the table becomes cards below 768px', async () => {
    renderQueue()
    await screen.findByText('TKT-2026-000001')

    const row = screen.getByText('Shared printer jams').closest('tr')!
    const labels = [...row.querySelectorAll('td')].map((cell) =>
      cell.getAttribute('data-label'),
    )
    expect(labels).toEqual([
      'Ticket No.',
      'Summary',
      'Requester',
      'IT Priority',
      'Status',
      'Owner',
      'Updated',
    ])
  })

  it('keeps the wide table in its own scrollable container', async () => {
    renderQueue()

    const table = await screen.findByRole('table')
    expect(table.parentElement).toHaveClass('zen-scroll-x')
  })
})

describe('UI-09 · AC-19 · the controls issue the query', () => {
  it('asks for the default queue on first load', async () => {
    renderQueue()

    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      )
    })
  })

  it('sends the search after typing pauses', async () => {
    renderQueue()
    await screen.findByText('TKT-2026-000001')

    await userEvent.type(
      screen.getByPlaceholderText(/search by ticket number or summary/i),
      'printer',
    )

    await waitFor(
      () => {
        expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'printer' }),
        )
      },
      { timeout: 2000 },
    )
  })

  it('sends the status, IT priority, and owner filters', async () => {
    renderQueue()
    await screen.findByText('TKT-2026-000001')
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'OPEN')
    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'OPEN' }),
      )
    })

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'IT Priority' }),
      'HIGH',
    )
    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'OPEN', itPriority: 'HIGH' }),
      )
    })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Owner' }), 'me')
    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ ownerId: 'me' }),
      )
    })
  })

  it('offers Anyone, Unassigned, and Assigned to me as the owner filter', async () => {
    renderQueue()

    const owner = await screen.findByRole('combobox', { name: 'Owner' })
    expect(within(owner).getByRole('option', { name: 'Anyone' })).toBeInTheDocument()
    expect(within(owner).getByRole('option', { name: 'Unassigned' })).toBeInTheDocument()
    expect(
      within(owner).getByRole('option', { name: 'Assigned to me' }),
    ).toBeInTheDocument()
  })

  it('clears every filter at once', async () => {
    renderQueue()
    await screen.findByText('TKT-2026-000001')
    const user = userEvent.setup()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'OPEN')
    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'OPEN' }),
      )
    })

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))
    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: '', itPriority: '', ownerId: '', search: '' }),
      )
    })
  })

  it('sorts by a whitelisted field when a column header is used', async () => {
    renderQueue()
    await screen.findByText('TKT-2026-000001')

    await userEvent.click(screen.getByRole('button', { name: /ticket no/i }))

    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'ticketNo:asc' }),
      )
    })
  })
})

describe('UI-09 · AC-19 · pagination', () => {
  it('offers no pager when everything fits on one page', async () => {
    renderQueue()
    await screen.findByText('TKT-2026-000001')

    expect(screen.queryByRole('navigation', { name: 'Queue pagination' })).toBeNull()
  })

  it('pages without resetting the page to one', async () => {
    fetchStaffQueueMock.mockResolvedValue(
      queueResponse([ASSIGNED], {
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 45,
          totalPages: 3,
          hasPreviousPage: false,
          hasNextPage: true,
        },
      }),
    )
    renderQueue()
    await screen.findByText('TKT-2026-000001')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      )
    })
  })

  it('returns to page one when a filter changes', async () => {
    fetchStaffQueueMock.mockResolvedValue(
      queueResponse([ASSIGNED], {
        pagination: {
          page: 2,
          pageSize: 20,
          totalItems: 45,
          totalPages: 3,
          hasPreviousPage: true,
          hasNextPage: true,
        },
      }),
    )
    renderQueue()
    await screen.findByText('TKT-2026-000001')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'OPEN',
    )

    await waitFor(() => {
      expect(fetchStaffQueueMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'OPEN', page: 1 }),
      )
    })
  })
})

describe('UI-10 · FR-36 · every state renders', () => {
  it('shows loading feedback while the request is in flight', async () => {
    fetchStaffQueueMock.mockReturnValue(new Promise(() => {}))
    renderQueue()

    expect(await screen.findByRole('status')).toHaveTextContent(/loading/i)
  })

  it('shows the empty state when the queue has nothing in it', async () => {
    fetchStaffQueueMock.mockResolvedValue(queueResponse([]))
    renderQueue()

    expect(await screen.findByText('No tickets in the queue.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear Filters' })).toBeDisabled()
  })

  it('distinguishes no-results from empty and offers Clear Filters', async () => {
    fetchStaffQueueMock.mockResolvedValue(
      queueResponse([], {
        appliedFilters: {
          search: 'nothing',
          status: null,
          itPriority: null,
          categoryId: null,
          ownerId: null,
          sort: 'itPriority:desc',
        },
      }),
    )
    renderQueue()

    expect(
      await screen.findByText('No tickets match these filters.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No tickets in the queue.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeEnabled()
  })

  describe('UI-18 · AC-36 · forbidden state', () => {
    it('shows the forbidden state for a role that may not be here', async () => {
      fetchStaffQueueMock.mockRejectedValue(
        new api.ApiRequestError('Queue request failed', [], 403, 'FORBIDDEN'),
      )
      renderQueue()

      const state = await screen.findByRole('alert')
      expect(state).toHaveClass('zen-state--forbidden')
      // Forbidden never offers Try again: retrying will not help, and offering
      // it implies the refusal was transient (ui-spec §4).
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    })
  })

  it('shows the failure state with Try again for anything else', async () => {
    fetchStaffQueueMock.mockRejectedValue(new Error('network'))
    renderQueue()

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(document.querySelector('.zen-state--forbidden')).toBeNull()
  })

  it('retries on request', async () => {
    fetchStaffQueueMock.mockRejectedValueOnce(new Error('network'))
    renderQueue()

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('TKT-2026-000001')).toBeInTheDocument()
  })
})
