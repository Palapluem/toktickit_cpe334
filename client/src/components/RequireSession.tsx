// Route guard. Renders nothing while the session is being resolved, so a
// protected screen never flashes before the redirect.
//
// The server's refusal is the control; this is feedback (SEC-016).
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.js'
import { CHANGE_PASSWORD_ROUTE, LOGIN_ROUTE } from '../routes.js'

export function RequireSession({ children }: { children?: ReactNode }) {
  const { user, status } = useSession()

  if (status === 'loading') return null
  if (!user) return <Navigate to={LOGIN_ROUTE} replace />

  // Every other route redirects here until the initial password is replaced
  // (BR-02). The server refuses them too; this only saves a round trip.
  if (user.mustChangePassword) {
    return <Navigate to={CHANGE_PASSWORD_ROUTE} replace />
  }

  return <>{children}</>
}
