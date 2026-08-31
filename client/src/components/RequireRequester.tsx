// Route guard (BR-12). Renders nothing while the stored id is being validated,
// so a protected screen never flashes before the redirect.
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useRequester } from '../context/RequesterContext.js'
import { LoadingState } from './States.js'

export function RequireRequester({ children }: { children?: ReactNode }) {
  const { requester, status } = useRequester()

  if (status === 'loading') return <LoadingState label="Checking requester…" />
  if (!requester) return <Navigate to="/select-requester" replace />

  return <>{children}</>
}
