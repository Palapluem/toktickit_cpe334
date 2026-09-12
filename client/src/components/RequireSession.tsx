// Route guard. Renders nothing while the session is being resolved, so a
// protected screen never flashes before the refusal.
//
// The server's refusal is the control; this is feedback (SEC-016). The Login
// screen it should send an unauthenticated visitor to arrives with L3-6, which
// replaces this panel with a redirect.
import type { ReactNode } from 'react'
import { useSession } from '../context/SessionContext.js'
import { EmptyState, LoadingState } from './States.js'

export function RequireSession({ children }: { children?: ReactNode }) {
  const { user, status } = useSession()

  if (status === 'loading') return <LoadingState label="Checking your session…" />

  if (!user) {
    return (
      <EmptyState
        title="Sign in to continue"
        detail="This page needs an active session."
      />
    )
  }

  return <>{children}</>
}
