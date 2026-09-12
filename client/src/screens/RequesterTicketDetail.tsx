import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  downloadAttachment,
  fetchTicket,
  indicateRequesterResolution,
  removeAttachment,
  uploadAttachment,
  type Ticket,
  type TicketAttachment,
  type TicketStatus,
} from '../api.js'
import { AttachmentSection } from '../components/AttachmentSection.js'
// Public Comments only. The Requester gets no Internal Notes affordance at
// all — not a disabled one (ui-spec §9, AC-09).
import { PublicCommentsSection } from '../components/ThreadSection.js'
import { Button } from '../components/Button.js'
import { PriorityBadge, StatusBadge } from '../components/Badge.js'
import { ErrorState, LoadingState } from '../components/States.js'

/** Nothing is owed on a Ticket in these, so there is nothing to report about. */
const CLOSED_STATUSES: TicketStatus[] = ['CLOSED', 'CANCELLED']

export type RequesterTicketDetailProps = {
  ticket?: Ticket
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function ReadOnlyValue({
  label,
  value,
  wide = false,
  multiline = false,
}: {
  label: string
  value: string
  wide?: boolean
  multiline?: boolean
}) {
  return (
    <div className={`ticket-detail-field${wide ? ' ticket-detail-field--wide' : ''}`}>
      <span className="ticket-detail-field__label">{label}</span>
      <div
        className={`ticket-detail-field__value${multiline ? ' ticket-detail-field__value--multiline' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

function ReadOnlyBadge({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="ticket-detail-field">
      <span className="ticket-detail-field__label">{label}</span>
      <div className="ticket-detail-field__value ticket-detail-field__value--badge">
        {children}
      </div>
    </div>
  )
}

export function RequesterTicketDetail({
  ticket: initialTicket,
}: RequesterTicketDetailProps = {}) {
  const { id: routeTicketId } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket ?? null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>(
    initialTicket ? 'ready' : 'loading',
  )
  const [reloadToken, setReloadToken] = useState(0)
  const [resolving, setResolving] = useState(false)
  const [resolutionError, setResolutionError] = useState('')

  async function indicateResolution() {
    if (!ticket || resolving) return
    setResolving(true)
    setResolutionError('')
    try {
      const result = await indicateRequesterResolution(ticket.id)
      setTicket((current) =>
        current
          ? { ...current, requesterResolvedAt: result.requesterResolvedAt }
          : current,
      )
    } catch {
      setResolutionError('That could not be recorded. Try again.')
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    if (initialTicket) {
      setTicket(initialTicket)
      setPhase('ready')
      return
    }
    if (!routeTicketId) {
      setTicket(null)
      setPhase('error')
      return
    }

    let cancelled = false
    setTicket(null)
    setPhase('loading')
    fetchTicket(routeTicketId)
      .then((nextTicket) => {
        if (cancelled) return
        setTicket(nextTicket)
        setPhase('ready')
      })
      .catch(() => {
        if (!cancelled) setPhase('error')
      })

    return () => {
      cancelled = true
    }
  }, [initialTicket, reloadToken, routeTicketId])

  async function addAttachment(file: File): Promise<TicketAttachment> {
    if (!ticket) throw new Error('Ticket is not loaded.')
    const response = await uploadAttachment(ticket.id, file)
    setTicket((current) =>
      current
        ? { ...current, attachments: [...current.attachments, response.data] }
        : current,
    )
    return response.data
  }

  async function removeTicketAttachment(
    attachmentId: string,
    reason: string,
  ): Promise<TicketAttachment> {
    const response = await removeAttachment(attachmentId, reason)
    setTicket((current) =>
      current
        ? {
            ...current,
            attachments: current.attachments.map((attachment) =>
              attachment.id === response.data.id ? response.data : attachment,
            ),
          }
        : current,
    )
    return response.data
  }

  async function downloadTicketAttachment(attachmentId: string): Promise<void> {
    const attachment = ticket?.attachments.find(({ id }) => id === attachmentId)
    if (!attachment) throw new Error('Attachment is not available.')
    const blob = await downloadAttachment(attachmentId)
    const objectUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = attachment.originalFilename
    link.click()
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0)
  }

  if (phase === 'loading') {
    return (
      <div className="ticket-detail-page">
        <div className="ticket-detail-page__intro">
          <p className="zen-page-kicker">Requester workspace</p>
          <h1>Ticket Details</h1>
        </div>
        <LoadingState label="Loading Ticket details…" />
      </div>
    )
  }

  if (phase === 'error' || !ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="ticket-detail-page__intro">
          <p className="zen-page-kicker">Requester workspace</p>
          <h1>Ticket Details</h1>
        </div>
        <ErrorState
          title="Could not load Ticket details"
          detail="This Ticket is not available to you."
          onRetry={() => setReloadToken((current) => current + 1)}
        />
      </div>
    )
  }

  const activeCount = ticket.attachments.filter(
    (attachment) => attachment.removedAt === null,
  ).length

  return (
    <div className="ticket-detail-page">
      <div className="ticket-detail-page__header">
        <div className="ticket-detail-page__intro">
          <p className="zen-page-kicker">Requester workspace</p>
          <h1>Ticket Details</h1>
          <p>Review the information and attachments for this Ticket.</p>
        </div>
        <div className="ticket-detail-page__header-actions">
          {/* The Requester cannot declare a problem solved (BR-22), but is the
              only person who knows it still is not. This records that. */}
          {ticket.requesterResolvedAt ? (
            <p className="staff-queue__resolved-marker">
              You reported this as appearing resolved
            </p>
          ) : CLOSED_STATUSES.includes(ticket.status) ? null : (
            <Button
              variant="secondary"
              busy={resolving}
              onClick={indicateResolution}
            >
              The problem appears resolved
            </Button>
          )}
          <Link className="zen-button zen-button--secondary" to="/tickets">
            Back to My Tickets
          </Link>
        </div>
      </div>

      {resolutionError ? (
        <p className="zen-auth__error" role="alert">
          {resolutionError}
        </p>
      ) : null}

      <section className="zen-card ticket-detail-card" aria-labelledby="ticket-information-heading">
        <h2 id="ticket-information-heading">Ticket Information</h2>
        <div className="ticket-detail-card__grid">
          <ReadOnlyValue label="Ticket No." value={ticket.ticketNo} />
          <ReadOnlyValue label="Ticket Date" value={formatDate(ticket.createdAt)} />
          <ReadOnlyValue label="Category" value={ticket.category.name} />
          <ReadOnlyValue label="Related System" value={ticket.relatedSystem.name} />
          <ReadOnlyValue label="Requester" value={ticket.requester.displayName} />
          <ReadOnlyBadge label="Requested Priority">
            <PriorityBadge value={ticket.requestedPriority} />
          </ReadOnlyBadge>
          <ReadOnlyBadge label="IT Priority">
            <PriorityBadge value={ticket.itPriority} />
          </ReadOnlyBadge>
          <ReadOnlyBadge label="Current Status">
            <StatusBadge value={ticket.status} />
          </ReadOnlyBadge>
          <ReadOnlyValue label="Ticket Owner" value="Not yet assigned" wide />
          <ReadOnlyValue label="Summary" value={ticket.summary} wide />
          <ReadOnlyValue
            label="Description"
            value={ticket.description}
            wide
            multiline
          />
        </div>
      </section>

      <div className="zen-card ticket-detail-card">
        <AttachmentSection
          ticketId={ticket.id}
          attachments={ticket.attachments}
          activeCount={activeCount}
          activeLimit={5}
          onAdd={addAttachment}
          onRemove={removeTicketAttachment}
          onDownload={downloadTicketAttachment}
        />
      </div>

      <PublicCommentsSection ticketId={ticket.id} />
    </div>
  )
}
