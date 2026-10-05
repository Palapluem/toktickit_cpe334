import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiRequestError,
  fetchStaffDashboard,
  type StaffDashboardResponse,
} from '../api.js'
import { ActionStatusBadge, PriorityBadge, StatusBadge } from '../components/Badge.js'
import { Button } from '../components/Button.js'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../components/States.js'
import { formatBangkokTime } from '../dateTime.js'

type Phase = 'loading' | 'ready' | 'forbidden' | 'failed'

function queueHref(query: Record<string, string>): string {
  return `/staff/tickets?${new URLSearchParams(query).toString()}`
}

function ticketWord(count: number): string {
  return count === 1 ? 'ticket' : 'tickets'
}

export function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardResponse | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [refreshing, setRefreshing] = useState(false)
  const hasLoaded = useRef(false)

  const load = useCallback(async () => {
    if (hasLoaded.current) setRefreshing(true)
    else setPhase('loading')
    try {
      setData(await fetchStaffDashboard())
      hasLoaded.current = true
      setPhase('ready')
    } catch (error) {
      setPhase(error instanceof ApiRequestError && error.status === 403 ? 'forbidden' : 'failed')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const dashboardHeader = (
    <header className="zen-dashboard__header">
      <div>
        <h1>Dashboard</h1>
        <p className="zen-dashboard__subtitle">The service desk right now.</p>
      </div>
      <Button variant="secondary" busy={refreshing} busyLabel="Refreshing…" onClick={() => void load()}>
        Refresh
      </Button>
      <span className="visually-hidden" aria-live="polite">
        {refreshing ? 'Refreshing dashboard.' : ''}
      </span>
    </header>
  )

  if (phase === 'loading') {
    return <section className="zen-dashboard">{dashboardHeader}<LoadingState label="Loading dashboard…" /></section>
  }
  if (phase === 'forbidden') {
    return (
      <section className="zen-dashboard">
        {dashboardHeader}
        <ForbiddenState
          detail="The IT Staff dashboard is available to IT Staff and Administrators."
          action={<Link className="zen-button zen-button--secondary" to="/dashboard">Open your Dashboard</Link>}
        />
      </section>
    )
  }
  if (phase === 'failed' || !data) {
    return (
      <section className="zen-dashboard">
        {dashboardHeader}
        <ErrorState
          title="We could not load the dashboard."
          detail="Try again to reload the IT Staff dashboard."
          onRetry={() => void load()}
        />
      </section>
    )
  }

  const cards = [
    { key: 'unassigned', label: 'Unassigned', noun: 'unassigned' },
    { key: 'assignedToMe', label: 'Assigned to me', noun: 'assigned' },
    { key: 'urgent', label: 'Urgent', noun: 'urgent' },
    { key: 'waitingForRequester', label: 'Waiting for Requester', noun: 'waiting' },
  ] as const

  return (
    <section className="zen-dashboard">
      {dashboardHeader}
      <section className="zen-dashboard__metrics" aria-label="Ticket metrics">
        {cards.map(({ key, label, noun }) => {
          const metric = data.metrics[key]
          const description = noun === 'waiting'
            ? `View ${metric.count} ${ticketWord(metric.count)} waiting for the Requester`
            : `View ${metric.count} ${noun} ${ticketWord(metric.count)}`
          return (
            <article className="zen-card zen-dashboard__metric" key={key}>
              <h2 className="zen-dashboard__metric-label">{label}</h2>
              <p className="zen-dashboard__metric-value">{metric.count}</p>
              <Link className="zen-dashboard__metric-link" to={queueHref(metric.query)}>{description}</Link>
            </article>
          )
        })}
      </section>

      <div className="zen-dashboard__staff-panels">
        <section className="zen-card zen-dashboard__panel" aria-labelledby="open-actions-heading">
          <h2 id="open-actions-heading">My open Actions ({data.myOpenActions.total})</h2>
          {data.myOpenActions.items.length === 0 ? (
            <EmptyState title="You have no open Actions." detail="New work assigned to you will appear here." />
          ) : (
            <ul className="zen-dashboard__list">
              {data.myOpenActions.items.map((action) => (
                <li key={action.actionId}>
                  <Link className="zen-dashboard__action-link" to={`/staff/tickets/${action.ticket.id}#actions`}>
                    <span className="zen-dashboard__ticket-heading">
                      <strong>{action.ticket.ticketNo}</strong> · {action.ticket.summary}
                    </span>
                    <span className="zen-dashboard__action-description">{action.description}</span>
                    <span className="zen-dashboard__meta">
                      <ActionStatusBadge value={action.status} />
                      <time dateTime={action.actionAt}>{formatBangkokTime(action.actionAt)}</time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.myOpenActions.total > 10 ? (
            <p className="zen-dashboard__footer">Showing the 10 oldest of {data.myOpenActions.total} open Actions.</p>
          ) : null}
        </section>

        <section className="zen-card zen-dashboard__panel" aria-labelledby="status-heading">
          <h2 id="status-heading">Tickets by status</h2>
          <ul className="zen-dashboard__status-list" aria-label="Tickets by status">
            {data.byStatus.map((row) => (
              <li key={row.status}>
                <StatusBadge value={row.status} />
                <span className="zen-dashboard__status-count">{row.count}</span>
                <Link to={queueHref(row.query)}>View {row.count} {ticketWord(row.count)}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="zen-card zen-dashboard__panel" aria-labelledby="recent-heading">
        <h2 id="recent-heading">Recently updated</h2>
        {data.recentlyUpdated.length === 0 ? (
          <EmptyState title="No recently updated Tickets." detail="Updated work will appear here." />
        ) : (
          <ul className="zen-dashboard__list zen-dashboard__recent-list">
            {data.recentlyUpdated.map((ticket) => (
              <li key={ticket.id}>
                <Link className="zen-dashboard__recent-link" to={`/staff/tickets/${ticket.id}`}>
                  <strong>{ticket.ticketNo}</strong><span className="zen-dashboard__summary">{ticket.summary}</span>
                  <span className="zen-dashboard__meta"><StatusBadge value={ticket.status} /><PriorityBadge value={ticket.itPriority} /></span>
                  <span>{ticket.owner?.displayName ?? 'Unassigned'}</span>
                  <time dateTime={ticket.updatedAt}>{formatBangkokTime(ticket.updatedAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="zen-dashboard__footer">
          <Link to={queueHref(data.recentlyUpdatedQuery)}>View all recently updated Tickets</Link>
        </p>
      </section>
    </section>
  )
}
