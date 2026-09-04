// UI-18 · AC-27 · BR-08/BR-15; TDT-01 equivalence partitioning for the
// read-only owned-ticket presentation.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RequesterTicketDetail } from '../../src/screens/RequesterTicketDetail.js'

const REQUESTER = {
  id: 'r-jennifer',
  displayName: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.ac.th',
}

const TICKET = {
  id: 'ticket-1',
  ticketNo: 'TKT-2026-000001',
  createdAt: '2026-09-01T08:00:00.000Z',
  updatedAt: '2026-09-01T08:00:00.000Z',
  summary: 'Printer queue is stuck',
  description: 'Print jobs remain queued after restarting the printer.',
  requestedPriority: 'MEDIUM' as const,
  itPriority: 'MEDIUM' as const,
  status: 'NEW' as const,
  requester: REQUESTER,
  category: { id: 'category-hardware', name: 'Hardware' },
  relatedSystem: { id: 'system-corporate-laptop', name: 'Corporate Laptop' },
  owner: null,
  attachments: [],
}

describe('UI-18 · AC-27 · owned Ticket Detail', () => {
  it('renders all ticket information as read-only and separates attachment actions', () => {
    render(
      <MemoryRouter initialEntries={['/tickets/ticket-1']}>
        <RequesterTicketDetail ticket={TICKET} requesterId={REQUESTER.id} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('heading', { name: 'Ticket Details' })).toBeInTheDocument()
    expect(screen.queryByText(TICKET.ticketNo)).toBeInTheDocument()
    expect(screen.queryByText(TICKET.summary)).toBeInTheDocument()
    expect(screen.queryByText(TICKET.description)).toBeInTheDocument()
    expect(screen.queryByText('Hardware')).toBeInTheDocument()
    expect(screen.queryByText('Corporate Laptop')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Attachments' })).toBeInTheDocument()

    const editableTextboxes = screen
      .queryAllByRole('textbox')
      .filter((control) => !control.hasAttribute('readonly') && !control.hasAttribute('disabled'))
    expect(editableTextboxes).toHaveLength(0)
  })
})
