// STUB — seam only (testing-contract.md §5). Implemented in the feat: commit.
export function LoadingState(_props: { label?: string }) {
  return null
}

export function EmptyState(_props: {
  title: string
  detail: string
  action?: React.ReactNode
}) {
  return null
}

export function ErrorState(_props: {
  title: string
  detail: string
  onRetry?: () => void
}) {
  return null
}
