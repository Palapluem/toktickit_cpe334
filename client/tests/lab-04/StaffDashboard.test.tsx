// UI-14/UI-15 · AC-27–AC-31 · the Staff Dashboard follows API-owned metric queries.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StaffDashboard } from '../../src/screens/StaffDashboard.js'

const { fetchStaffDashboardMock } = vi.hoisted(() => ({ fetchStaffDashboardMock: vi.fn() }))
vi.mock('../../src/api.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api.js')>()),
  fetchStaffDashboard: fetchStaffDashboardMock,
}))

const metric = (count: number, query: Record<string, string>) => ({ count, query })
const DASHBOARD = {
  generatedAt: '2026-10-05T02:00:00.000Z',
  metrics: {
    unassigned: metric(2, { ownerId: 'unassigned', statusGroup: 'active' }),
    assignedToMe: metric(1, { ownerId: 'me', statusGroup: 'active' }),
    urgent: metric(3, { itPriority: 'URGENT', statusGroup: 'active' }),
    waitingForRequester: metric(1, { status: 'WAITING_FOR_REQUESTER' }),
  },
  byStatus: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']
    .map((status) => ({ status, count: status === 'OPEN' ? 1 : 0, query: { status } })),
  myOpenActions: {
    total: 12,
    items: Array.from({ length: 10 }, (_, index) => ({
      actionId: `action-${index}`,
      status: index % 2 ? 'IN_PROGRESS' : 'PLANNED',
      description: `Inspect relay item ${index}`,
      actionAt: `2026-10-0${index + 1}T00:00:00.000Z`,
      ticket: {
        id: `ticket-${index}`,
        ticketNo: `TKT-2026-${String(index + 1).padStart(6, '0')}`,
        summary: `Ticket summary ${index}`,
        itPriority: 'HIGH',
        status: 'OPEN',
      },
    })),
  },
  recentlyUpdated: [{
    id: 'recent-1', ticketNo: 'TKT-2026-900001', summary: 'A recent ticket', status: 'OPEN',
    itPriority: 'URGENT', owner: { displayName: 'Patricia Evans' }, updatedAt: '2026-10-05T01:00:00.000Z',
  }],
  recentlyUpdatedQuery: { sort: 'updatedAt:desc' },
}

function renderDashboard() {
  return render(<MemoryRouter><StaffDashboard /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchStaffDashboardMock.mockResolvedValue(DASHBOARD)
})

describe('UI-14 · AC-27/28 · staff metrics and work items', () => {
  it('uses descriptive metric links, shows eight statuses, and lists the ten oldest Actions', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View 2 unassigned tickets' }))
      .toHaveAttribute('href', '/staff/tickets?ownerId=unassigned&statusGroup=active')
    expect(screen.getByRole('link', { name: 'View 1 assigned ticket' }))
      .toHaveAttribute('href', '/staff/tickets?ownerId=me&statusGroup=active')
    expect(screen.getByText('Tickets by status')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(9)
    expect(screen.getByText('Showing the 10 oldest of 12 open Actions.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /TKT-2026-000001/ })).toHaveAttribute('href', '/staff/tickets/ticket-0#actions')
  })
})

describe('UI-15 · AC-29/31 · staff dashboard states and recovery', () => {
  it('shows loading, safely reports failure, retries and recovers', async () => {
    let finish!: (value: typeof DASHBOARD) => void
    fetchStaffDashboardMock.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    const user = userEvent.setup()
    renderDashboard()
    expect(screen.getByText('Loading dashboard…')).toBeInTheDocument()
    finish(DASHBOARD)
    expect(await screen.findByText('Tickets by status')).toBeInTheDocument()

    fetchStaffDashboardMock.mockRejectedValueOnce(new Error('private database detail'))
    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByText('We could not load the dashboard.')).toBeInTheDocument()
    expect(screen.queryByText('private database detail')).not.toBeInTheDocument()
    fetchStaffDashboardMock.mockResolvedValueOnce(DASHBOARD)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.getByText('Tickets by status')).toBeInTheDocument())
  })
})
