// Routes for the four Lab 2 screens plus the Lab 1 demonstration (§11.18, §11.19).
// Screens are placeholders until their own Issues: #17, #20, #21, #22.
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell.js'
import { EmptyState } from './components/States.js'
import { SystemCheck } from './screens/SystemCheck.js'
import { StyleGuide } from './screens/StyleGuide.js'
import { SelectRequester } from './screens/SelectRequester.js'
import { RequireRequester } from './components/RequireRequester.js'

function Placeholder({ title, issue }: { title: string; issue: string }) {
  return (
    <EmptyState title={title} detail={`Implemented in Issue ${issue}.`} />
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tickets" replace />} />

      <Route path="/select-requester" element={<SelectRequester />} />

      <Route
        element={
          <AppShell>
            <Outlet />
          </AppShell>
        }
      >
        <Route
          path="/tickets"
          element={
            <RequireRequester>
              <Placeholder title="My Tickets" issue="#21" />
            </RequireRequester>
          }
        />
        <Route
          path="/tickets/new"
          element={
            <RequireRequester>
              <Placeholder title="Create Ticket" issue="#20" />
            </RequireRequester>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <RequireRequester>
              <Placeholder title="Ticket Detail" issue="#22" />
            </RequireRequester>
          }
        />
        <Route path="/system-check" element={<SystemCheck />} />
        <Route path="/style-guide" element={<StyleGuide />} />
      </Route>
    </Routes>
  )
}

export default App
