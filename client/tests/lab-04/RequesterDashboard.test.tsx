// UI-16/UI-17 · AC-02, AC-29, AC-31 · only the authenticated Requester's metrics render.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RequesterDashboard } from '../../src/screens/RequesterDashboard.js'

const { fetchRequesterDashboardMock } = vi.hoisted(() => ({ fetchRequesterDashboardMock: vi.fn() }))
vi.mock('../../src/api.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/api.js')>()),
  fetchRequesterDashboard: fetchRequesterDashboardMock,
}))

const DASHBOARD = {
  generatedAt: '2026-10-05T02:00:00.000Z',
  totalTickets: 3,
  metrics: {
    open: { count: 2, query: { statusGroup: 'active' } },
    needsAttention: { count: 1, query: { status: 'WAITING_FOR_REQUESTER' } },
    resolved: { count: 0, query: { status: 'RESOLVED' } },
    closed: { count: 0, query: { status: 'CLOSED' } },
  },
  recentlyUpdated: [{
    id: 'owned-1', ticketNo: 'TKT-2026-900005', summary: 'Your request', status: 'WAITING_FOR_REQUESTER',
    updatedAt: '2026-10-05T01:00:00.000Z',
  }],
  recentlyUpdatedQuery: { sort: 'updatedAt:desc' },
}

function renderDashboard() {
  return render(<MemoryRouter><RequesterDashboard /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchRequesterDashboardMock.mockResolvedValue(DASHBOARD)
})

describe('UI-16 · AC-02/29 · Requester dashboard content', () => {
  it('shows owned metrics, a text attention cue, recent Tickets and descriptive drill-downs', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Waiting for your reply')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View 2 open tickets' }))
      .toHaveAttribute('href', '/tickets?statusGroup=active')
    expect(screen.getByRole('link', { name: 'View 1 ticket waiting for you' }))
      .toHaveAttribute('href', '/tickets?status=WAITING_FOR_REQUESTER')
    expect(screen.getByText('TKT-2026-900005')).toBeInTheDocument()
  })
})

describe('UI-17 · AC-29/31 · Requester empty, forbidden and failure states', () => {
  it('replaces four zero cards with the first-use empty state', async () => {
    fetchRequesterDashboardMock.mockResolvedValueOnce({ ...DASHBOARD, totalTickets: 0 })
    renderDashboard()
    expect(await screen.findByText('You have not submitted any Tickets yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Ticket' })).toHaveAttribute('href', '/tickets/new')
    expect(screen.queryByText('Needs my attention')).not.toBeInTheDocument()
  })

  it('offers a safe retry after a failed load', async () => {
    fetchRequesterDashboardMock.mockRejectedValueOnce(new Error('private failure detail'))
    renderDashboard()
    expect(await screen.findByText('We could not load the dashboard.')).toBeInTheDocument()
    expect(screen.queryByText('private failure detail')).not.toBeInTheDocument()
    fetchRequesterDashboardMock.mockResolvedValueOnce(DASHBOARD)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Waiting for your reply')).toBeInTheDocument()
  })
})
