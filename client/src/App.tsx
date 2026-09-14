// Routes for the Lab 2 Requester screens, the Lab 3 authentication screens,
// and the Lab 1 demonstration (lab-02 §11.18, §11.19).
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell.js'
import { SystemCheck } from './screens/SystemCheck.js'
import { StyleGuide } from './screens/StyleGuide.js'
import { CreateTicket } from './screens/CreateTicket.js'
import { MyTickets } from './screens/MyTickets.js'
import { RequesterTicketDetail } from './screens/RequesterTicketDetail.js'
import { StaffTicketQueue } from './screens/StaffTicketQueue.js'
import { Login } from './screens/Login.js'
import { ChangePassword } from './screens/ChangePassword.js'
import { RequireSession } from './components/RequireSession.js'
import { useSession } from './context/SessionContext.js'
import { CHANGE_PASSWORD_ROUTE, LOGIN_ROUTE, homeFor } from './routes.js'

function ShellLayout() {
  const { pathname } = useLocation()
  const breadcrumb =
    pathname === '/staff/tickets'
      ? ['Ticket Queue']
      : pathname === '/tickets/new'
      ? ['My Tickets', 'Create Ticket']
      : pathname.startsWith('/tickets/')
        ? ['My Tickets', 'Ticket Details']
        : pathname === '/tickets'
          ? ['My Tickets']
          : []

  return (
    <AppShell breadcrumb={breadcrumb}>
      <Outlet />
    </AppShell>
  )
}

/**
 * The shell renders the identity and Logout but no navigation: there is
 * nowhere else to go, and links that all redirect back here are a loop the
 * user has to discover (ui-spec §7).
 */
function ChangePasswordLayout() {
  const { user, status } = useSession()

  if (status === 'loading') return null
  if (!user) return <Navigate to={LOGIN_ROUTE} replace />
  if (!user.mustChangePassword) return <Navigate to={homeFor(user.role)} replace />

  return (
    <AppShell showNavigation={false} breadcrumb={['Change Password']}>
      <ChangePassword />
    </AppShell>
  )
}

/** Signed in already? The sign-in screen has nothing to offer. */
function LoginRoute() {
  const { user, status } = useSession()

  if (status === 'loading') return null
  if (user) {
    return (
      <Navigate
        to={user.mustChangePassword ? CHANGE_PASSWORD_ROUTE : homeFor(user.role)}
        replace
      />
    )
  }
  return <Login />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      <Route path={LOGIN_ROUTE} element={<LoginRoute />} />
      <Route path={CHANGE_PASSWORD_ROUTE} element={<ChangePasswordLayout />} />

      <Route element={<ShellLayout />}>
        <Route
          path="/tickets"
          element={
            <RequireSession>
              <MyTickets />
            </RequireSession>
          }
        />
        <Route
          path="/tickets/new"
          element={
            <RequireSession>
              <CreateTicket />
            </RequireSession>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <RequireSession>
              <RequesterTicketDetail />
            </RequireSession>
          }
        />
        {/* A Requester reaching this URL directly gets the forbidden state
            from the server's refusal, which is the control (ui-spec §8). */}
        <Route
          path="/staff/tickets"
          element={
            <RequireSession>
              <StaffTicketQueue />
            </RequireSession>
          }
        />
        <Route path="/system-check" element={<SystemCheck />} />
        <Route path="/style-guide" element={<StyleGuide />} />
      </Route>
    </Routes>
  )
}

export default App
