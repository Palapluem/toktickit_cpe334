// UI-12…UI-17 (#21). AC-18…AC-26; TDT-03 decision-table coverage for the
// list states and the search, filter, sort, pagination interaction.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../src/api.js'
import {
  RequesterProvider,
  STORAGE_KEY,
  useRequester,
} from '../../src/context/RequesterContext.js'
import { MyTickets } from '../../src/screens/MyTickets.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return {
    ...actual,
    fetchCategories: vi.fn(),
    fetchRequesters: vi.fn(),
    fetchTickets: vi.fn(),
  }
})

const REQUESTER_A = {
  id: 'r-jennifer',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
}

const REQUESTER_B = {
  id: 'r-michael',
  displayName: 'Michael Brown',
  email: 'michael.brown@example.ac.th',
}

const LIST_ITEM = {
  id: 'ticket-1',
  ticketNo: 'TKT-2026-000001',
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  summary: 'Printer queue is stuck',
  requestedPriority: 'HIGH' as const,
  itPriority: 'URGENT' as const,
  status: 'NEW' as const,
  owner: null,
  category: { id: 'category-hardware', name: 'Hardware' },
  relatedSystem: { id: 'system-email', name: 'Email' },
  activeAttachmentCount: 2,
}

const LIST_RESPONSE = {
  data: [LIST_ITEM],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  },
  appliedFilters: {
    search: null,
    categoryId: null,
    relatedSystemId: null,
    requestedPriority: null,
    itPriority: null,
    status: null,
    sort: 'createdAt:desc',
  },
}

const CATEGORIES = [
  { id: 'category-hardware', name: 'Hardware' },
  { id: 'category-software', name: 'Software' },
]

function ContextSwitcher() {
  const { select } = useRequester()
  return (
    <button type="button" onClick={() => select(REQUESTER_B)}>
      Switch requester
    </button>
  )
}

function renderScreen(withSwitcher = false) {
  return render(
    <MemoryRouter initialEntries={['/tickets']}>
      <RequesterProvider>
        <MyTickets />
        {withSwitcher ? <ContextSwitcher /> : null}
      </RequesterProvider>
    </MemoryRouter>,
  )
}

const fetchRequestersMock = vi.mocked(api.fetchRequesters)
const fetchCategoriesMock = vi.mocked(api.fetchCategories)
const fetchTicketsMock = vi.mocked(api.fetchTickets)

beforeEach(() => {
  window.sessionStorage.clear()
  window.sessionStorage.setItem(STORAGE_KEY, REQUESTER_A.id)
  fetchRequestersMock.mockResolvedValue([REQUESTER_A, REQUESTER_B])
  fetchCategoriesMock.mockResolvedValue(CATEGORIES)
  fetchTicketsMock.mockResolvedValue(LIST_RESPONSE)
})

describe('UI-12 · AC-18 · My Tickets list', () => {
  it('renders the page controls and requester rows after loading', async () => {
    renderScreen()

    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByText('View and track all of your support requests.')).toBeInTheDocument()
    expect(await screen.findByText(LIST_ITEM.ticketNo)).toBeInTheDocument()
    expect(screen.getByText(LIST_ITEM.summary)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: LIST_ITEM.ticketNo })).toHaveAttribute(
      'href',
      `/tickets/${LIST_ITEM.id}`,
    )
    expect(screen.getByRole('button', { name: 'Create Ticket' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument()
  })

  it('keeps the wide result table in its own scrollable container', async () => {
    renderScreen()

    const table = await screen.findByRole('table')

    expect(table.parentElement).toHaveClass('zen-scroll-x')
  })
})

describe('UI-12 · loading state', () => {
  it('shows loading feedback and disables filters while the list request is pending', async () => {
    fetchTicketsMock.mockReturnValue(new Promise(() => {}))
    renderScreen()

    expect(await screen.findByRole('status')).toHaveTextContent(/loading/i)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by ticket number or summary…')).toBeDisabled()
      expect(screen.getByRole('combobox', { name: 'Category' })).toBeDisabled()
    })
  })
})

describe('UI-13 · AC-19 · requester switch', () => {
  it('clears the previous list immediately and refetches for the new requester', async () => {
    let resolveB!: (value: typeof LIST_RESPONSE) => void
    fetchTicketsMock
      .mockResolvedValueOnce(LIST_RESPONSE)
      .mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve }))
    renderScreen(true)
    expect(await screen.findByText(LIST_ITEM.summary)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Switch requester' }))

    await waitFor(() => {
      expect(fetchTicketsMock).toHaveBeenLastCalledWith(REQUESTER_B.id, expect.any(Object))
    })
    expect(screen.queryByText(LIST_ITEM.summary)).not.toBeInTheDocument()
    resolveB({ ...LIST_RESPONSE, data: [] })
  })
})

describe('UI-14/UI-15 · AC-25/AC-26 · empty and no-results', () => {
  it('shows the empty state with a Create Ticket action when no tickets exist', async () => {
    fetchTicketsMock.mockResolvedValue({
      ...LIST_RESPONSE,
      data: [],
      pagination: { ...LIST_RESPONSE.pagination, totalItems: 0, totalPages: 0 },
    })
    renderScreen()

    expect(await screen.findByText('You have not created any tickets yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Ticket' })).toHaveAttribute(
      'href',
      '/tickets/new',
    )
  })

  it('shows a distinct no-results state with Clear Filters', async () => {
    fetchTicketsMock.mockResolvedValue({
      ...LIST_RESPONSE,
      data: [],
      appliedFilters: { ...LIST_RESPONSE.appliedFilters, search: 'missing' },
    })
    renderScreen()

    expect(await screen.findByText('No tickets match these filters.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Clear Filters' })).toHaveLength(2)
  })
})

describe('UI-16 · AC-20/AC-21/AC-22 · query wiring', () => {
  it('sends search, category, requested priority, IT priority, status, and sort values', async () => {
    renderScreen()
    await screen.findByText(LIST_ITEM.summary)
    const user = userEvent.setup()

    const search = screen.getByPlaceholderText('Search by ticket number or summary…')
    await user.clear(search)
    await user.type(search, 'printer')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'category-hardware')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Requested Priority' }),
      'HIGH',
    )
    await user.selectOptions(screen.getByRole('combobox', { name: 'IT Priority' }), 'URGENT')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Current Status' }), 'ASSIGNED')
    await user.click(screen.getByRole('button', { name: /sort by summary/i }))

    await waitFor(() => {
      expect(fetchTicketsMock).toHaveBeenLastCalledWith(REQUESTER_A.id, {
        search: 'printer',
        categoryId: 'category-hardware',
        requestedPriority: 'HIGH',
        itPriority: 'URGENT',
        status: 'ASSIGNED',
        sort: 'summary:asc',
        page: 1,
        pageSize: 10,
      })
    })
  })

  it('waits for search typing to pause before refetching', async () => {
    renderScreen()
    await screen.findByText(LIST_ITEM.summary)
    const initialCallCount = fetchTicketsMock.mock.calls.length
    const search = screen.getByPlaceholderText('Search by ticket number or summary…')

    fireEvent.change(search, { target: { value: 'p' } })
    fireEvent.change(search, { target: { value: 'pr' } })
    fireEvent.change(search, { target: { value: 'printer' } })

    expect(fetchTicketsMock).toHaveBeenCalledTimes(initialCallCount)

    await waitFor(() => {
      expect(fetchTicketsMock).toHaveBeenLastCalledWith(REQUESTER_A.id, {
        search: 'printer',
        sort: 'createdAt:desc',
        page: 1,
        pageSize: 10,
      })
    })
  })
})

describe('UI-17 · AC-23 · pagination controls', () => {
  it('renders pagination metadata and requests the next page', async () => {
    fetchTicketsMock.mockResolvedValue({
      ...LIST_RESPONSE,
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: 2,
        totalPages: 2,
        hasPreviousPage: false,
        hasNextPage: true,
      },
    })
    renderScreen()
    expect(await screen.findByText('Showing 1 to 1 of 2 tickets')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(fetchTicketsMock).toHaveBeenLastCalledWith(
        REQUESTER_A.id,
        expect.objectContaining({ page: 2, pageSize: 1 }),
      )
    })
  })
})

describe('UI-12 · API failure', () => {
  it('shows a safe retry state and preserves selected filter values', async () => {
    fetchTicketsMock
      .mockResolvedValueOnce(LIST_RESPONSE)
      .mockRejectedValueOnce(new Error('secret database details'))
    renderScreen()
    await screen.findByText(LIST_ITEM.summary)
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'category-hardware')

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i)
    expect(screen.getByRole('alert')).not.toHaveTextContent(/secret database/i)
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('category-hardware')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
