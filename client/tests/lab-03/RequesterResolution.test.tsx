// AC-16. The Requester's "appears resolved" signal on their own Ticket Detail.
// It is a timestamp, never a status: BR-22 forbids a Requester declaring a
// problem solved, and they are still the only person who knows it is not (§11.7).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as api from '../../src/api.js'
import { RequesterTicketDetail } from '../../src/screens/RequesterTicketDetail.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return { ...actual, indicateRequesterResolution: vi.fn() }
})

const indicateMock = vi.mocked(api.indicateRequesterResolution)

const TICKET: api.Ticket = {
  id: 't-1',
  ticketNo: 'TKT-2026-000001',
  createdAt: '2026-09-01T04:00:00.000Z',
  updatedAt: '2026-09-08T06:00:00.000Z',
  summary: 'Shared printer jams',
  description: 'Double-sided printing jams on the second sheet.',
  requestedPriority: 'MEDIUM',
  itPriority: 'HIGH',
  status: 'IN_PROGRESS',
  requesterResolvedAt: null,
  requester: { id: 'r-1', displayName: 'Jennifer Anderson' },
  category: { id: 'c-1', name: 'Hardware' },
  relatedSystem: { id: 's-1', name: 'Printer' },
  owner: null,
  attachments: [],
}

function renderDetail(ticket: api.Ticket = TICKET) {
  return render(
    <MemoryRouter initialEntries={['/tickets/t-1']}>
      <RequesterTicketDetail ticket={ticket} />
    </MemoryRouter>,
  )
}

const ACTION = 'The problem appears resolved'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AC-17 · the Requester may say the problem appears resolved', () => {
  it('offers the action on an open Ticket', async () => {
    renderDetail()

    expect(await screen.findByRole('button', { name: ACTION })).toBeInTheDocument()
  })

  it('records it and reports back, without claiming a status change', async () => {
    indicateMock.mockResolvedValue({
      requesterResolvedAt: '2026-09-09T02:00:00.000Z',
      status: 'IN_PROGRESS',
    })
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: ACTION }))

    await waitFor(() => {
      expect(indicateMock).toHaveBeenCalledWith('t-1')
    })
    expect(
      await screen.findByText(/you reported this as appearing resolved/i),
    ).toBeInTheDocument()
    // The status is unchanged, and the screen does not pretend otherwise.
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument()
  })

  it('offers it once, not repeatedly', async () => {
    renderDetail({ ...TICKET, requesterResolvedAt: '2026-09-09T02:00:00.000Z' })

    expect(
      await screen.findByText(/you reported this as appearing resolved/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: ACTION })).not.toBeInTheDocument()
  })

  it('offers nothing on a Ticket where nothing is owed', async () => {
    for (const status of ['CLOSED', 'CANCELLED'] as const) {
      const { unmount } = renderDetail({ ...TICKET, status })
      expect(
        await screen.findByText('TKT-2026-000001'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: ACTION })).not.toBeInTheDocument()
      unmount()
    }
  })

  it('never offers a control that would set RESOLVED or CLOSED (BR-22)', async () => {
    renderDetail()
    await screen.findByRole('button', { name: ACTION })

    expect(screen.queryByRole('combobox', { name: /status/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^resolve/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^close/i })).not.toBeInTheDocument()
  })

  it('reports a failure without pretending it worked', async () => {
    indicateMock.mockRejectedValue(new Error('network'))
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: ACTION }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be recorded/i)
    expect(
      screen.queryByText(/you reported this as appearing resolved/i),
    ).not.toBeInTheDocument()
  })
})
