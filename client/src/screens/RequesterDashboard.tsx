import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiRequestError,
  fetchRequesterDashboard,
  type RequesterDashboardResponse,
} from '../api.js'
import { StatusBadge } from '../components/Badge.js'
import { ErrorState, ForbiddenState, LoadingState } from '../components/States.js'
import { formatBangkokTime } from '../dateTime.js'

type Phase = 'loading' | 'ready' | 'forbidden' | 'failed'

function ticketWord(count: number): string {
  return count === 1 ? 'ticket' : 'tickets'
}

function listHref(query: Record<string, string>): string {
  return `/tickets?${new URLSearchParams(query).toString()}`
}

export function RequesterDashboard() {
  const [data, setData] = useState<RequesterDashboardResponse | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')

  const load = useCallback(async () => {
    setPhase('loading')
    try {
      setData(await fetchRequesterDashboard())
      setPhase('ready')
    } catch (error) {
      setPhase(error instanceof ApiRequestError && error.status === 403 ? 'forbidden' : 'failed')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const header = (
    <header className="zen-dashboard__header">
      <div>
        <h1>Dashboard</h1>
        <p className="zen-dashboard__subtitle">Your requests at a glance.</p>
      </div>
      <Link className="zen-button zen-button--primary" to="/tickets/new">Create Ticket</Link>
    </header>
  )

  if (phase === 'loading') {
    return <section className="zen-dashboard">{header}<LoadingState label="Loading dashboard…" /></section>
  }
  if (phase === 'forbidden') {
    return (
      <section className="zen-dashboard">
        {header}
        <ForbiddenState
          detail="The Requester dashboard is only available to Requesters."
          action={<Link className="zen-button zen-button--secondary" to="/staff/dashboard">Open your Dashboard</Link>}
        />
      </section>
    )
  }
  if (phase === 'failed' || !data) {
    return (
      <section className="zen-dashboard">
        {header}
        <ErrorState
          title="We could not load the dashboard."
          detail="Try again to reload your dashboard."
          onRetry={() => void load()}
        />
      </section>
    )
  }

  if (data.totalTickets === 0) {
    return (
      <section className="zen-dashboard">
        {header}
        <div className="zen-card">
          <div className="zen-state">
            <p className="zen-state__title">You have not submitted any Tickets yet.</p>
            <p className="zen-state__detail">Create a Ticket when you need help from the service desk.</p>
            <Link className="zen-button zen-button--primary" to="/tickets/new">Create Ticket</Link>
          </div>
        </div>
      </section>
    )
  }

  const cards = [
    { key: 'open', label: 'Open', link: (count: number) => `View ${count} open ${ticketWord(count)}` },
    { key: 'needsAttention', label: 'Needs my attention', link: (count: number) => `View ${count} ${count === 1 ? 'ticket' : 'tickets'} waiting for you` },
    { key: 'resolved', label: 'Resolved', link: (count: number) => `View ${count} resolved ${ticketWord(count)}` },
    { key: 'closed', label: 'Closed', link: (count: number) => `View ${count} closed ${ticketWord(count)}` },
  ] as const

  return (
    <section className="zen-dashboard">
      {header}
      <section className="zen-dashboard__metrics" aria-label="Your Ticket metrics">
        {cards.map(({ key, label, link }) => {
          const metric = data.metrics[key]
          return (
            <article className="zen-card zen-dashboard__metric" key={key}>
              <h2 className="zen-dashboard__metric-label">{label}</h2>
              <p className="zen-dashboard__metric-value">{metric.count}</p>
              <Link className="zen-dashboard__metric-link" to={listHref(metric.query)}>{link(metric.count)}</Link>
              {key === 'needsAttention' && metric.count > 0 ? (
                <span className="zen-dashboard__attention">Waiting for your reply</span>
              ) : null}
            </article>
          )
        })}
      </section>

      <section className="zen-card zen-dashboard__panel" aria-labelledby="requester-recent-heading">
        <h2 id="requester-recent-heading">Recently updated</h2>
        {data.recentlyUpdated.length === 0 ? (
          <p className="zen-dashboard__footer">There are no recently updated Tickets.</p>
        ) : (
          <ul className="zen-dashboard__list zen-dashboard__recent-list zen-dashboard__requester-recent">
            {data.recentlyUpdated.map((ticket) => (
              <li key={ticket.id}>
                <Link className="zen-dashboard__requester-link" to={`/tickets/${ticket.id}`}>
                  <strong>{ticket.ticketNo}</strong><span className="zen-dashboard__summary">{ticket.summary}</span>
                  <StatusBadge value={ticket.status} />
                  <time dateTime={ticket.updatedAt}>{formatBangkokTime(ticket.updatedAt)}</time>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="zen-dashboard__footer">
          <Link to={listHref(data.recentlyUpdatedQuery)}>View all recently updated Tickets</Link>
        </p>
      </section>
    </section>
  )
}
