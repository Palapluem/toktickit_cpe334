// STYLE-03 · STY-019: every Lab 3 status badge carries its value as text.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge, type TicketStatus } from '../../src/components/Badge.js'

const STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
]

describe('STYLE-03 · STY-019 · all status labels are readable without colour', () => {
  it.each(STATUSES)('renders the %s value as text', (status) => {
    render(<StatusBadge value={status} />)

    expect(screen.getByText(status, { exact: true })).toBeInTheDocument()
  })
})
