// DASH-02/08/10 · AC-27/33 · dashboard URLs must survive list-screen initialization.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StaffTicketQueue } from '../../src/screens/StaffTicketQueue.js'
import { MyTickets } from '../../src/screens/MyTickets.js'
import { SessionProvider } from '../../src/context/SessionContext.js'

const { fetchStaffQueueMock, fetchTicketsMock, fetchCategoriesMock, fetchCurrentUserMock } = vi.hoisted(() => ({
  fetchStaffQueueMock: vi.fn(),
  fetchTicketsMock: vi.fn(),
  fetchCategoriesMock: vi.fn(),
  fetchCurrentUserMock: vi.fn(),
}))

vi.mock('../../src/api.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api.js')>()),
  fetchStaffQueue: fetchStaffQueueMock,
  fetchTickets: fetchTicketsMock,
  fetchCategories: fetchCategoriesMock,
  fetchCurrentUser: fetchCurrentUserMock,
}))

const EMPTY_LIST = {
  data: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
  appliedFilters: { search: null, status: null, statusGroup: 'active', itPriority: null, categoryId: null, ownerId: 'me', sort: 'itPriority:desc' },
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchStaffQueueMock.mockResolvedValue(EMPTY_LIST)
  fetchTicketsMock.mockResolvedValue({ ...EMPTY_LIST, pagination: { ...EMPTY_LIST.pagination, pageSize: 10 }, appliedFilters: { ...EMPTY_LIST.appliedFilters, ownerId: undefined } })
  fetchCategoriesMock.mockResolvedValue([])
  fetchCurrentUserMock.mockResolvedValue({
    id: 'requester-1', displayName: 'Jennifer Anderson', email: 'jennifer@example.ac.th',
    role: 'REQUESTER', mustChangePassword: false,
  })
})

describe('dashboard drill-down URLs initialize list filters', () => {
  it('DASH-02 · applies the Staff metric owner and active group to the Queue request', async () => {
    render(<MemoryRouter initialEntries={['/staff/tickets?ownerId=me&statusGroup=active']}><StaffTicketQueue /></MemoryRouter>)
    await waitFor(() => expect(fetchStaffQueueMock).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'me', statusGroup: 'active' })))
  })

  it('DASH-08/10 · applies active Requester metrics to My Tickets', async () => {
    render(<MemoryRouter initialEntries={['/tickets?statusGroup=active']}><SessionProvider><MyTickets /></SessionProvider></MemoryRouter>)
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalledWith(expect.objectContaining({ statusGroup: 'active' })))
  })

  it('DASH-08 · applies the Requester attention metric filter', async () => {
    render(<MemoryRouter initialEntries={['/tickets?status=WAITING_FOR_REQUESTER']}><SessionProvider><MyTickets /></SessionProvider></MemoryRouter>)
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'WAITING_FOR_REQUESTER' })))
  })
})
