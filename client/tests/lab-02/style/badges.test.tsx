// STYLE-06 (#19). ui-spec §10, AC-36, STY-019, STY-030.
// TDT-01: one representative per priority value; all four behave the same way.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  PriorityBadge,
  StatusBadge,
  type Priority,
} from '../../../src/components/Badge.js'

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

describe('STYLE-06 · badges are never colour alone', () => {
  it.each(PRIORITIES)('renders %s as text', (value) => {
    render(<PriorityBadge value={value} />)

    expect(screen.getByText(value)).toBeInTheDocument()
  })

  it('renders a status as text', () => {
    render(<StatusBadge value="NEW" />)

    expect(screen.getByText('NEW')).toBeInTheDocument()
  })

  // STY-030: priority uses its own tokens, never the semantic ones.
  it.each(PRIORITIES)('styles %s with a priority class, not a semantic one', (value) => {
    const { container } = render(<PriorityBadge value={value} />)
    const className = container.firstElementChild?.className ?? ''

    expect(className).toMatch(/priority/i)
    expect(className).not.toMatch(/\b(error|danger|warning|success)\b/i)
  })

  it('gives the four priorities four distinct classes', () => {
    const classes = PRIORITIES.map((value) => {
      const { container, unmount } = render(<PriorityBadge value={value} />)
      const className = container.firstElementChild?.className ?? ''
      unmount()
      return className
    })

    expect(new Set(classes).size).toBe(4)
  })
})
