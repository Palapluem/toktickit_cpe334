// STUB — seam only (testing-contract.md §5). Implemented in the feat: commit.
import type { ReactNode } from 'react'
import type { Requester } from '../api.js'

export type RequesterContextValue = {
  requester: Requester | null
  status: 'loading' | 'ready'
  select: (requester: Requester) => void
  clear: () => void
}

export function RequesterProvider(_props: { children?: ReactNode }) {
  return null
}

export function useRequester(): RequesterContextValue {
  return { requester: null, status: 'ready', select: () => {}, clear: () => {} }
}
