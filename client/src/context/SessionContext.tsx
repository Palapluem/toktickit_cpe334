// The authenticated user, asked for from the server on mount and never stored.
// Lab 2 kept a requester id in sessionStorage; a session cookie replaces both
// the storage and the selector, and the role comes only from /api/auth/me (SEC-005).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchCurrentUser, type SessionUser } from '../api.js'

export type SessionContextValue = {
  user: SessionUser | null
  status: 'loading' | 'ready'
  refresh: () => Promise<void>
  clear: () => void
}

const Ctx = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  const load = useCallback(async () => {
    try {
      setUser(await fetchCurrentUser())
    } catch {
      // 401 is the ordinary answer for a visitor with no session, not a fault.
      setUser(null)
    } finally {
      setStatus('ready')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const clear = useCallback(() => {
    setUser(null)
    setStatus('ready')
  }, [])

  const value = useMemo(
    () => ({ user, status, refresh: load, clear }),
    [user, status, load, clear],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(Ctx)
  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider')
  }
  return value
}

// For components that render both inside the app and standalone, such as the
// shell in the style gallery. Returns null rather than throwing.
export function useOptionalSession(): SessionContextValue | null {
  return useContext(Ctx)
}
