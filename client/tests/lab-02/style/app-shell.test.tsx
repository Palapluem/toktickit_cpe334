// STYLE-07 (#19). ui-spec §5, STY-007.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../../../src/components/AppShell.js'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell requesterName="Jennifer Anderson" />
    </MemoryRouter>,
  )
}

describe('STYLE-07 · application shell', () => {
  it('renders the TokTickIT identity', () => {
    renderAt('/tickets')

    expect(screen.getByText('TokTickIT')).toBeInTheDocument()
  })

  it('renders both ticket navigation links', () => {
    renderAt('/tickets')

    expect(screen.getByRole('link', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Ticket' })).toBeInTheDocument()
  })

  it('shows the current development requester', () => {
    renderAt('/tickets')

    expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()
  })

  it('offers a Change Requester action', () => {
    renderAt('/tickets')

    expect(
      screen.getByRole('button', { name: /change requester/i }),
    ).toBeInTheDocument()
  })
})

describe('STYLE-07 · active page is not colour alone', () => {
  it('marks the active link with aria-current="page"', () => {
    renderAt('/tickets')

    expect(screen.getByRole('link', { name: 'My Tickets' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('does not mark an inactive link', () => {
    renderAt('/tickets')

    expect(
      screen.getByRole('link', { name: 'Create Ticket' }),
    ).not.toHaveAttribute('aria-current', 'page')
  })

  it('moves the marker when the route changes', () => {
    renderAt('/tickets/new')

    expect(screen.getByRole('link', { name: 'Create Ticket' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'My Tickets' })).not.toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})
