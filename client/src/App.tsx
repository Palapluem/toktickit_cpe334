// Routes for the four Lab 2 screens plus the Lab 1 demonstration (§11.18, §11.19).
// Screens are placeholders until their own Issues: #17, #20, #21, #22.
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.js'
import { EmptyState } from './components/States.js'
import { SystemCheck } from './screens/SystemCheck.js'

function Placeholder({ title, issue }: { title: string; issue: string }) {
  return (
    <EmptyState title={title} detail={`Implemented in Issue ${issue}.`} />
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      <Route
        path="/select-requester"
        element={<Placeholder title="Select Development Requester" issue="#17" />}
      />

      <Route
        element={
          <AppShell requesterName={undefined}>
            <Outlet />
          </AppShell>
        }
      >
        <Route
          path="/tickets"
          element={<Placeholder title="My Tickets" issue="#21" />}
        />
        <Route
          path="/tickets/new"
          element={<Placeholder title="Create Ticket" issue="#20" />}
        />
        <Route
          path="/tickets/:id"
          element={<Placeholder title="Ticket Detail" issue="#22" />}
        />
        <Route path="/system-check" element={<SystemCheck />} />
      </Route>
    </Routes>
  )
}

export default App
