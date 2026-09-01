import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  downloadAttachment,
  fetchTicket,
  removeAttachment,
  uploadAttachment,
  type Ticket,
  type TicketAttachment,
} from '../api.js'
import { AttachmentSection } from '../components/AttachmentSection.js'
import { PriorityBadge, StatusBadge } from '../components/Badge.js'
import { ErrorState, LoadingState } from '../components/States.js'
import { useOptionalRequester } from '../context/RequesterContext.js'

export type RequesterTicketDetailProps = {
  ticket?: Ticket
  requesterId?: string
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
  requesterId: initialRequesterId,
}: RequesterTicketDetailProps = {}) {
  const context = useOptionalRequester()
  const { id: routeTicketId } = useParams<{ id: string }>()
  const requesterId = initialRequesterId ?? context?.requester?.id ?? ''
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket ?? null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>(
    initialTicket ? 'ready' : 'loading',
  )
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (initialTicket) {
      setTicket(initialTicket)
      setPhase('ready')
      return
    }
    if (!requesterId || !routeTicketId) {
      setTicket(null)
      setPhase('error')
      return
    }

    let cancelled = false
    setTicket(null)
    setPhase('loading')
    fetchTicket(requesterId, routeTicketId)
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
  }, [initialTicket, requesterId, reloadToken, routeTicketId])

  async function addAttachment(file: File): Promise<TicketAttachment> {
    if (!ticket) throw new Error('Ticket is not loaded.')
    const response = await uploadAttachment(requesterId, ticket.id, file)
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
    const response = await removeAttachment(requesterId, attachmentId, reason)
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
    const blob = await downloadAttachment(requesterId, attachmentId)
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
          detail="This Ticket is unavailable in the current requester context."
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
        <Link className="zen-button zen-button--secondary" to="/tickets">
          Back to My Tickets
        </Link>
      </div>

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

      {ticket.attachmentFailures.length > 0 ? (
        <div className="zen-state zen-state--error ticket-detail-page__alert" role="alert">
          <p className="zen-state__title">Some attachments were not stored</p>
          <p className="zen-state__detail">
            You can try adding them again from this Ticket.
          </p>
        </div>
      ) : null}

      <div className="zen-card ticket-detail-card">
        <AttachmentSection
          ticketId={ticket.id}
          requesterId={requesterId}
          attachments={ticket.attachments}
          activeCount={activeCount}
          activeLimit={5}
          onAdd={addAttachment}
          onRemove={removeTicketAttachment}
          onDownload={downloadTicketAttachment}
        />
      </div>
    </div>
  )
}
