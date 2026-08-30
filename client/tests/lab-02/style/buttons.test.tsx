// STYLE-04, STYLE-05 (#19). ui-spec §4, §3.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../../src/components/Button.js'

describe('STYLE-04 · button hierarchy', () => {
  it('renders each variant with a distinct class', () => {
    const { rerender } = render(<Button variant="primary">Submit</Button>)
    const classFor = () => screen.getByRole('button').className

    const primary = classFor()
    rerender(<Button variant="secondary">Cancel</Button>)
    const secondary = classFor()
    rerender(<Button variant="tertiary">Clear</Button>)
    const tertiary = classFor()
    rerender(<Button variant="destructive">Remove</Button>)
    const destructive = classFor()

    expect(new Set([primary, secondary, tertiary, destructive]).size).toBe(4)
  })

  it('always renders visible text', () => {
    render(<Button variant="primary">Submit Ticket</Button>)

    expect(screen.getByRole('button', { name: 'Submit Ticket' })).toBeVisible()
  })

  it('cannot be activated when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" disabled onClick={onClick}>
        Submit
      </Button>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    await userEvent.click(button).catch(() => undefined)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('STYLE-05 · busy state', () => {
  it('disables the button and announces the busy label while in flight', () => {
    render(
      <Button variant="primary" busy busyLabel="Submitting…">
        Submit Ticket
      </Button>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveTextContent('Submitting…')
  })

  // BR-24: a second click must not produce a second ticket.
  it('does not fire onClick while busy', async () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" busy onClick={onClick}>
        Submit
      </Button>,
    )

    await userEvent.click(screen.getByRole('button')).catch(() => undefined)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is neither disabled nor busy at rest', () => {
    render(<Button variant="primary">Submit</Button>)

    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
    expect(button).not.toHaveAttribute('aria-busy', 'true')
  })
})
