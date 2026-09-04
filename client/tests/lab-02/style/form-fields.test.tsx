// STYLE-01, STYLE-02, STYLE-03 (#19). ui-spec §3.
// TDT-01: editable / read-only / invalid are the classes that behave differently.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormField } from '../../../src/components/FormField.js'

describe('STYLE-01 · required-field marker', () => {
  it('marks a required field with an asterisk', () => {
    render(
      <FormField id="summary" label="Summary" required>
        <input id="summary" />
      </FormField>,
    )

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Summary/)).toHaveAttribute('aria-required', 'true')
  })

  // The asterisk never replaces the message (ui-spec §3).
  it('shows the asterisk and the validation message together', () => {
    render(
      <FormField id="summary" label="Summary" required error="Summary is required.">
        <input id="summary" />
      </FormField>,
    )

    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByText('Summary is required.')).toBeInTheDocument()
  })

  it('does not mark an optional field', () => {
    render(
      <FormField id="note" label="Note">
        <input id="note" />
      </FormField>,
    )

    // Asserted first: without it the absence of an asterisk is also satisfied
    // by a component that renders nothing at all.
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })
})

describe('STYLE-02 · read-only distinction', () => {
  it('sets the readonly attribute and the read-only class', () => {
    render(
      <FormField id="ticketNo" label="Ticket Number" readOnly>
        <input id="ticketNo" defaultValue="TKT-2026-000001" />
      </FormField>,
    )

    const input = screen.getByLabelText('Ticket Number')
    expect(input).toHaveAttribute('readonly')
    expect(input.className).toMatch(/readonly/i)
  })

  it('leaves an editable field without either', () => {
    render(
      <FormField id="summary" label="Summary">
        <input id="summary" />
      </FormField>,
    )

    const input = screen.getByLabelText('Summary')
    expect(input).not.toHaveAttribute('readonly')
    expect(input.className).not.toMatch(/readonly/i)
  })
})

describe('STYLE-03 · message placement', () => {
  it('associates the message with its field via aria-describedby', () => {
    render(
      <FormField id="summary" label="Summary" error="Summary is too short.">
        <input id="summary" />
      </FormField>,
    )

    const input = screen.getByLabelText('Summary')
    const describedBy = input.getAttribute('aria-describedby')

    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Summary is too short.',
    )
  })

  it('sets aria-invalid on the field when it has an error', () => {
    render(
      <FormField id="summary" label="Summary" error="Summary is too short.">
        <input id="summary" />
      </FormField>,
    )

    expect(screen.getByLabelText('Summary')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not set aria-invalid on a valid field', () => {
    render(
      <FormField id="summary" label="Summary">
        <input id="summary" />
      </FormField>,
    )

    expect(screen.getByLabelText('Summary')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
