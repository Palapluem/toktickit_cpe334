// Component state gallery smoke test (#19). STY-001, STY-003, STY-020.
// It is the Part 9 capture surface, so every required state must be rendered.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StyleGuide } from '../../../src/screens/StyleGuide.js'

describe('style guide · every required control state is present', () => {
  // Queried by accessible name, not label text: the required asterisk is
  // aria-hidden, so assistive technology reads "Summary", not "Summary*".
  it('shows an editable, a read-only, an invalid, and a disabled field', () => {
    render(<StyleGuide />)

    expect(screen.getByRole('textbox', { name: 'Ticket Number' })).toHaveAttribute(
      'readonly',
    )
    expect(screen.getByRole('textbox', { name: 'Summary' })).not.toHaveAttribute(
      'readonly',
    )
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByLabelText('Ticket Owner')).toBeDisabled()
  })

  it('shows all four button variants and a disabled one', () => {
    render(<StyleGuide />)

    for (const name of [
      'Submit Ticket',
      'Cancel',
      'Clear Filters',
      'Remove Attachment',
    ]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('shows every priority and status badge', () => {
    render(<StyleGuide />)

    for (const value of ['LOW', 'MEDIUM', 'HIGH', 'URGENT']) {
      expect(screen.getByText(value)).toBeInTheDocument()
    }
    expect(screen.getByText('NEW')).toBeInTheDocument()
    expect(screen.getByText('CANCELLED')).toBeInTheDocument()
  })

  it('shows the loading, empty, and error states together', () => {
    render(<StyleGuide />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('You have no tickets yet')).toBeInTheDocument()
  })
})
