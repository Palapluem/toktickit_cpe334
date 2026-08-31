// Current requester, held in sessionStorage for the life of the tab (§11.20).
// Only the identifier is stored; name and email are refetched, so a renamed
// requester is never shown from a stale copy.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchRequesters, type Requester } from '../api.js'

export const STORAGE_KEY = 'toktickit.requesterId'

export type RequesterContextValue = {
  requester: Requester | null
  status: 'loading' | 'ready'
  select: (requester: Requester) => void
  clear: () => void
}

const Ctx = createContext<RequesterContextValue | null>(null)

export function RequesterProvider({ children }: { children?: ReactNode }) {
  const [requester, setRequester] = useState<Requester | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  // A stored id survives a reseed that regenerated every UUID, so it is checked
  // against the live list rather than trusted (§11.20).
  useEffect(() => {
    const storedId = window.sessionStorage.getItem(STORAGE_KEY)
    if (!storedId) {
      setStatus('ready')
      return
    }

    let cancelled = false
    fetchRequesters()
      .then((requesters) => {
        if (cancelled) return
        const match = requesters.find((r) => r.id === storedId) ?? null
        if (!match) window.sessionStorage.removeItem(STORAGE_KEY)
        setRequester(match)
      })
      .catch(() => {
        if (!cancelled) setRequester(null)
      })
      .finally(() => {
        if (!cancelled) setStatus('ready')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const select = useCallback((next: Requester) => {
    window.sessionStorage.setItem(STORAGE_KEY, next.id)
    setRequester(next)
    setStatus('ready')
  }, [])

  const clear = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY)
    setRequester(null)
    setStatus('ready')
  }, [])

  const value = useMemo(
    () => ({ requester, status, select, clear }),
    [requester, status, select, clear],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRequester(): RequesterContextValue {
  const value = useContext(Ctx)
  if (!value) {
    throw new Error('useRequester must be used inside a RequesterProvider')
  }
  return value
}

// For components that render both inside the app and standalone, such as the
// shell in the style gallery. Returns null rather than throwing.
export function useOptionalRequester(): RequesterContextValue | null {
  return useContext(Ctx)
}
