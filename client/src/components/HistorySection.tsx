// The Ticket history (lab-04 ui-spec §7, BR-28, BR-30). One line per event: time, actor and a sentence made from
// the event type and its identifiers' display names. No free text from a user ever appears here.
import { useEffect, useState } from 'react'
import { fetchTicketHistory, type TicketEvent } from '../api.js'
import { priorityLabel, statusLabel } from '../ticketLabels.js'
import { Button } from './Button.js'

const FIELD_LABEL: Record<string, string> = {
  description: 'Description',
  result: 'Result',
  followUpRequired: 'Follow-up Required',
  followUpNote: 'Follow-up Note',
  attachmentNotes: 'Attachment Notes',
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/** What happened, in words. The Action events return the Action they belong to, so they can link to it. */
function describeEvent(event: TicketEvent): string {
  const d = event.details
  switch (event.type) {
    case 'STATUS_CHANGED': {
      const base = `Status changed from ${statusLabel(text(d.from))} to ${statusLabel(text(d.to))}`
      const count = typeof d.cascadedActionCount === 'number' ? d.cascadedActionCount : 0
      return count > 0 ? `${base}. ${count} open ${count === 1 ? 'Action was' : 'Actions were'} cancelled.` : base
    }
    case 'OWNER_CHANGED':
      return `Owner changed from ${text(d.fromOwner) || 'Unassigned'} to ${text(d.toOwner) || 'Unassigned'}`
    case 'IT_PRIORITY_CHANGED':
      return `IT Priority changed from ${priorityLabel(text(d.from))} to ${priorityLabel(text(d.to))}`
    case 'ACTION_CREATED':
      return `Action added and assigned to ${text(d.assignee)}`
    case 'ACTION_UPDATED': {
      const fields = Array.isArray(d.changedFields) ? d.changedFields.map((field) => FIELD_LABEL[text(field)] ?? text(field)) : []
      return `Action updated: ${fields.join(', ')}`
    }
    case 'ACTION_ASSIGNED':
      return `Action assigned from ${text(d.fromAssignee)} to ${text(d.toAssignee)}`
    case 'ACTION_STARTED':
      return 'Action started'
    case 'ACTION_COMPLETED':
      return 'Action completed'
    case 'ACTION_CANCELLED':
      return d.cascade === true ? 'Action cancelled because the Ticket was cancelled' : 'Action cancelled'
  }
}

/** Each Action row on the Ticket carries `id="action-<id>"`, so an event can point at it. */
const actionAnchor = (event: TicketEvent): string | null =>
  event.type.startsWith('ACTION_') && typeof event.details.actionId === 'string' ? `#action-${event.details.actionId}` : null

export function HistorySection({ ticketId, refreshKey }: { ticketId: string; refreshKey?: string }) {
  const [events, setEvents] = useState<TicketEvent[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchTicketHistory(ticketId)
      .then((next) => {
        if (cancelled) return
        setEvents(next)
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [ticketId, refreshKey, attempt])

  return (
    <section className="zen-card history" aria-label="History">
      <h2>History</h2>
      {failed ? (
        <div role="alert">
          <p>The history could not be loaded.</p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </Button>
        </div>
      ) : events === null ? (
        <p role="status">Loading…</p>
      ) : events.length === 0 ? (
        <p className="history__empty">No changes have been recorded since Actions Taken were introduced.</p>
      ) : (
        <ol className="history__events">
          {events.map((event) => {
            const anchor = actionAnchor(event)
            const sentence = describeEvent(event)
            return (
              <li key={event.id} className="history__event">
                <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                <span className="history__actor">{event.actor.displayName}</span>
                {anchor ? <a href={anchor}>{sentence}</a> : <span>{sentence}</span>}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
