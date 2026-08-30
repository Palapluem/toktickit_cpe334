// Application shell (ui-spec §5). NavLink supplies aria-current="page"; the
// underline in --zen-secondary means active state is not colour alone (STY-007).
import { useState, type ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Button } from './Button.js'

export type AppShellProps = {
  requesterName?: string
  onChangeRequester?: () => void
  breadcrumb?: string[]
  children?: ReactNode
}

const NAV = [
  { to: '/tickets', label: 'My Tickets' },
  { to: '/tickets/new', label: 'Create Ticket' },
]

export function AppShell({
  requesterName,
  onChangeRequester,
  breadcrumb,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="zen-shell">
      <header
        className="zen-shell__header d-flex flex-wrap align-items-center gap-3"
        onKeyDown={(event) => {
          if (event.key === 'Escape') setMenuOpen(false)
        }}
      >
        <Link className="zen-shell__brand" to="/tickets">
          TokTickIT
        </Link>

        <button
          type="button"
          className="zen-button zen-button--tertiary d-md-none"
          aria-expanded={menuOpen}
          aria-controls="zen-shell-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>

        <nav
          id="zen-shell-nav"
          aria-label="Main"
          className={`d-md-flex gap-4 ${menuOpen ? 'd-flex' : 'd-none'}`}
        >
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `zen-shell__nav-link${isActive ? ' zen-shell__nav-link--active' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {requesterName ? (
          <div className="ms-auto d-flex align-items-center gap-2">
            <span>{requesterName}</span>
            <Button variant="tertiary" onClick={onChangeRequester}>
              Change Requester
            </Button>
          </div>
        ) : null}
      </header>

      {breadcrumb?.length ? (
        <p className="zen-shell__breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.join(' › ')}
        </p>
      ) : null}

      <main className="zen-shell__main">{children}</main>
    </div>
  )
}
