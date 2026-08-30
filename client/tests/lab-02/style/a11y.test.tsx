// STYLE-08 (#19). AC-37, ui-spec §12, STY-026, STY-028.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FormField } from '../../../src/components/FormField.js'
import { AppShell } from '../../../src/components/AppShell.js'
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../../src/components/States.js'

describe('STYLE-08 · every control is programmatically labelled', () => {
  // STY-026: a placeholder is not a label.
  it('associates the label with its control', () => {
    render(
      <FormField id="summary" label="Summary">
        <input id="summary" placeholder="Short description" />
      </FormField>,
    )

    expect(screen.getByLabelText('Summary')).toBeInTheDocument()
  })

  it('gives every icon-only control an accessible name', () => {
    render(
      <MemoryRouter>
        <AppShell requesterName="Jennifer Anderson" />
      </MemoryRouter>,
    )

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName()
    }
  })
})

describe('STYLE-08 · reusable states are announced, not just drawn', () => {
  it('announces loading to assistive technology', () => {
    render(<LoadingState label="Loading tickets" />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading tickets')
  })

  // STY-021: "no data" alone does not say what to do next.
  it('gives the empty state a title and a detail', () => {
    render(
      <EmptyState
        title="You have no tickets yet"
        detail="Create your first ticket to get started."
      />,
    )

    expect(screen.getByText('You have no tickets yet')).toBeInTheDocument()
    expect(
      screen.getByText('Create your first ticket to get started.'),
    ).toBeInTheDocument()
  })

  it('gives the error state an alert role and a retry action', () => {
    render(
      <ErrorState
        title="Could not load tickets"
        detail="The server did not respond."
        onRetry={() => undefined}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load tickets')
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
