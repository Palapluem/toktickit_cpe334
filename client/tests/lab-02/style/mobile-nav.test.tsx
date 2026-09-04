// Mobile navigation contract (#19). AC-35, AC-37, STY-007, STY-023.
// Playwright owns viewport layout; jsdom proves the toggle and keyboard path.
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../../../src/components/AppShell.js'

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/tickets']}>
      <AppShell requesterName="Jennifer Anderson" />
    </MemoryRouter>,
  )
}

const toggle = () => screen.getByRole('button', { name: /menu/i })

describe('mobile navigation · toggle contract', () => {
  it('starts collapsed', () => {
    renderShell()

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('points at the navigation it controls', () => {
    renderShell()

    const controls = toggle().getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    expect(document.getElementById(controls!)).toBeInTheDocument()
  })

  it('expands on click', async () => {
    renderShell()

    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses on a second click', async () => {
    renderShell()

    await userEvent.click(toggle())
    await userEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('mobile navigation · keyboard operable', () => {
  it('opens from the keyboard alone', async () => {
    renderShell()

    await userEvent.tab()
    await userEvent.tab()
    expect(toggle()).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
  })

  it('closes on Escape', async () => {
    renderShell()

    await userEvent.click(toggle())
    await userEvent.keyboard('{Escape}')
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  // Escape from a nav link, not just from the toggle — that is where focus
  // actually is once the menu is open.
  it('closes on Escape while focus is inside the menu', async () => {
    renderShell()

    await userEvent.click(toggle())
    screen.getByRole('link', { name: 'My Tickets' }).focus()
    await userEvent.keyboard('{Escape}')

    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('returns focus to the toggle after Escape', async () => {
    renderShell()

    await userEvent.click(toggle())
    screen.getByRole('link', { name: 'My Tickets' }).focus()
    await userEvent.keyboard('{Escape}')

    expect(toggle()).toHaveFocus()
  })
})

describe('mobile navigation · the requester stays visible', () => {
  // ui-spec §5: the current requester remains visible on mobile, collapsed or not.
  it('shows the requester without opening the menu', () => {
    renderShell()

    expect(screen.getByText('Jennifer Anderson')).toBeInTheDocument()
  })
})
