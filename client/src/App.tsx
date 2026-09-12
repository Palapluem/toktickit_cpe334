// Routes for the four Lab 2 screens plus the Lab 1 demonstration (§11.18, §11.19).
// Screen implementations land incrementally through the Lab 2 Issue flow.
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell.js'
import { SystemCheck } from './screens/SystemCheck.js'
import { StyleGuide } from './screens/StyleGuide.js'
import { CreateTicket } from './screens/CreateTicket.js'
import { MyTickets } from './screens/MyTickets.js'
import { RequesterTicketDetail } from './screens/RequesterTicketDetail.js'
import { RequireSession } from './components/RequireSession.js'

function ShellLayout() {
  const { pathname } = useLocation()
  const breadcrumb =
    pathname === '/tickets/new'
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

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      <Route
        element={<ShellLayout />}
      >
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
        <Route path="/system-check" element={<SystemCheck />} />
        <Route path="/style-guide" element={<StyleGuide />} />
      </Route>
    </Routes>
  )
}

export default App
