// Application shell (ui-spec §5). NavLink supplies aria-current="page"; the
// underline in --zen-secondary means active state is not colour alone (STY-007).
import { useRef, useState, type ReactNode } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { logout } from '../api.js'
import { useOptionalSession } from '../context/SessionContext.js'
import { LOGIN_ROUTE, navigationFor } from '../routes.js'
import { Button } from './Button.js'
import { RoleBadge } from './Badge.js'

export type AppShellProps = {
  userName?: string
  breadcrumb?: string[]
  showNavigation?: boolean
  children?: ReactNode
}

export function AppShell({
  userName,
  breadcrumb,
  showNavigation = true,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const session = useOptionalSession()
  const navigate = useNavigate()

  const user = session?.user ?? null
  const name = userName ?? user?.displayName
  const destinations = navigationFor(user?.role ?? 'REQUESTER')
  const toggleRef = useRef<HTMLButtonElement>(null)

  async function signOut() {
    try {
      await logout()
    } catch {
      // Swallowed deliberately: this runs from a click handler nobody awaits,
      // so a rethrow would surface as an unhandled rejection and change nothing.
    } finally {
      // The session ends on screen either way: the server is the authority and
      // will refuse the next request regardless of what this call did.
      session?.clear()
      navigate(LOGIN_ROUTE, { replace: true })
    }
  }

  // Escape returns focus to the toggle. Without this a keyboard user who
  // dismisses the menu is left focused on a link that is now hidden.
  function closeMenu() {
    setMenuOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <div className="zen-shell">
      <header
        className="zen-shell__header d-flex flex-wrap align-items-center gap-3"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) closeMenu()
        }}
      >
        <Link className="zen-shell__brand" to="/tickets">
          TokTickIT
        </Link>

        {showNavigation ? (
          <button
            ref={toggleRef}
            type="button"
            className="zen-button zen-button--tertiary zen-shell__header-action d-md-none"
            aria-expanded={menuOpen}
            aria-controls="zen-shell-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
        ) : null}

        {showNavigation ? (
          <nav
            id="zen-shell-nav"
            aria-label="Main"
            className={`zen-shell__nav d-md-flex gap-4 ${menuOpen ? 'd-flex' : 'd-none'}`}
          >
            {destinations.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                end
                className={({ isActive }) =>
                  `zen-shell__nav-link${isActive ? ' zen-shell__nav-link--active' : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        ) : null}

        {name ? (
          <div className="ms-auto d-flex align-items-center gap-2">
            <span>{name}</span>
            {user ? <RoleBadge value={user.role} /> : null}
            {session ? (
              <Button
                variant="tertiary"
                className="zen-shell__header-action"
                onClick={signOut}
              >
                Logout
              </Button>
            ) : null}
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
