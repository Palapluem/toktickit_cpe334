// Reusable loading / empty / error states (STY-020, STY-021).
// Empty and error say what happened and what to do next; "no data" does not.
import type { ReactNode } from 'react'
import { Button } from './Button.js'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="zen-state" role="status" aria-live="polite">
      {label}
    </div>
  )
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div className="zen-state">
      <p className="zen-state__title">{title}</p>
      <p className="zen-state__detail">{detail}</p>
      {action}
    </div>
  )
}

export function ErrorState({
  title,
  detail,
  onRetry,
}: {
  title: string
  detail: string
  onRetry?: () => void
}) {
  return (
    <div className="zen-state zen-state--error" role="alert">
      <p className="zen-state__title">{title}</p>
      <p className="zen-state__detail">{detail}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Forbidden is not an error and not "not found": the system is working and the
 * user is not permitted (lab-03 ui-spec §4). It never offers Try again —
 * retrying will not help, and offering it implies the refusal was transient.
 */
export function ForbiddenState({
  title = 'You do not have access to this page',
  detail,
  action,
}: {
  title?: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div className="zen-state zen-state--forbidden" role="alert">
      <p className="zen-state__title">{title}</p>
      <p className="zen-state__detail">{detail}</p>
      {action}
    </div>
  )
}
