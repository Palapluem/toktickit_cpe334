// IT Staff Ticket Detail (ui-spec §9).
//
// The operational strip is grouped and separated from the read-only body, so
// what can be changed is obvious at a glance. Read-only means no control at
// all — a disabled one implies someone, somewhere, may change it.
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ApiRequestError,
  downloadAttachment,
  fetchStaffTicket,
  removeAttachment,
  setItPriority,
  setTicketOwner,
  setTicketStatus,
  uploadAttachment,
  type Priority,
  type StaffTicket,
  type TicketAttachment,
  type TicketStatus,
} from '../api.js'
import { PriorityBadge, StatusBadge } from '../components/Badge.js'
import { Button } from '../components/Button.js'
import { AttachmentSection } from '../components/AttachmentSection.js'
import { FormField } from '../components/FormField.js'
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from '../components/States.js'
import {
  InternalNotesSection,
  PublicCommentsSection,
} from '../components/ThreadSection.js'

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

type Phase = 'loading' | 'ready' | 'forbidden' | 'notFound' | 'failed'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function ReadOnly({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <FormField id={id} label={label} readOnly>
      <input value={value} readOnly />
    </FormField>
  )
}

export function StaffTicketDetail() {
  const { id: routeTicketId } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<StaffTicket | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!routeTicketId) {
      setPhase('notFound')
      return
    }

    let cancelled = false
    setPhase('loading')
    fetchStaffTicket(routeTicketId)
      .then((next) => {
        if (cancelled) return
        setTicket(next)
        setPhase('ready')
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiRequestError && error.status === 403) {
          setPhase('forbidden')
          return
        }
        if (error instanceof ApiRequestError && error.status === 404) {
          setPhase('notFound')
          return
        }
        setPhase('failed')
      })

    return () => {
      cancelled = true
    }
  }, [routeTicketId, reloadToken])

  const run = useCallback(
    async (operation: () => Promise<StaffTicket>) => {
      if (busy) return
      setBusy(true)
      setActionError('')
      try {
        setTicket(await operation())
      } catch (error) {
        // The refusal is shown and nothing on screen moves: the server did not
        // make the change, so neither does the view.
        setActionError(
          error instanceof ApiRequestError
            ? error.message
            : 'The change could not be saved. Try again.',
        )
      } finally {
        setBusy(false)
      }
    },
    [busy],
  )

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

  if (phase === 'loading') return <LoadingState label="Loading the ticket…" />

  if (phase === 'forbidden') {
    return (
      <ForbiddenState detail="Ticket Detail for the queue is available to IT Staff and Administrators." />
    )
  }

  if (phase === 'notFound') {
    return (
      <EmptyState
        title="Ticket not found"
        detail="This Ticket is not available to you."
      />
    )
  }

  if (phase === 'failed' || !ticket) {
    return (
      <ErrorState
        title="The ticket could not be loaded"
        detail="Something went wrong while fetching this Ticket."
        onRetry={() => setReloadToken((value) => value + 1)}
      />
    )
  }

  const ownerOptions = ticket.owner && !ticket.assignableOwners.some(({ id }) => id === ticket.owner?.id)
    ? [ticket.owner, ...ticket.assignableOwners]
    : ticket.assignableOwners
  const activeAttachmentCount = ticket.attachments.filter(
    (attachment) => attachment.removedAt === null,
  ).length

  return (
    <div className="ticket-detail-page staff-ticket">
      <header className="ticket-detail-page__header">
        <div>
          <h1>{ticket.ticketNo}</h1>
          <p>{ticket.summary}</p>
        </div>
        <div className="staff-ticket__header-badges">
          <StatusBadge value={ticket.status} />
          <PriorityBadge value={ticket.itPriority} />
          {ticket.requesterResolvedAt ? (
            <span className="staff-queue__resolved-marker">Requester says resolved</span>
          ) : null}
        </div>
      </header>

      {actionError ? (
        <p className="zen-auth__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <section className="zen-card staff-ticket__operations" aria-labelledby="operations-heading">
        <h2 id="operations-heading">Operations</h2>

        <div className="staff-ticket__operations-row">
          <div className="staff-ticket__owner">
            {ticket.owner ? (
              <>
                <p>{ticket.owner.displayName}</p>
                <FormField id="owner" label="Owner">
                  <select
                    value={ticket.owner.id}
                    disabled={busy}
                    onChange={(event) =>
                      run(() => setTicketOwner(ticket.id, event.target.value || null))
                    }
                  >
                    <option value="">No owner</option>
                    {ownerOptions.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.displayName}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Button
                  variant="tertiary"
                  busy={busy}
                  onClick={() => run(() => setTicketOwner(ticket.id, null))}
                >
                  Unassign
                </Button>
              </>
            ) : (
              <>
                <p className="staff-queue__unassigned">Unassigned</p>
                <FormField id="owner" label="Owner">
                  <select
                    value=""
                    disabled={busy}
                    onChange={(event) =>
                      run(() => setTicketOwner(ticket.id, event.target.value || null))
                    }
                  >
                    <option value="">No owner</option>
                    {ownerOptions.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.displayName}
                      </option>
                    ))}
                  </select>
                </FormField>
                <Button
                  variant="secondary"
                  busy={busy}
                  onClick={() => run(() => setTicketOwner(ticket.id, 'me'))}
                >
                  Claim
                </Button>
              </>
            )}
          </div>

          <FormField id="itPriority" label="IT Priority">
            <select
              value={ticket.itPriority}
              disabled={busy}
              onChange={(event) =>
                run(() => setItPriority(ticket.id, event.target.value as Priority))
              }
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="status" label="Status">
            <select
              value=""
              disabled={busy || ticket.permittedTransitions.length === 0}
              onChange={(event) =>
                run(() => setTicketStatus(ticket.id, event.target.value as TicketStatus))
              }
            >
              {/* Only what the server permits for this status and role. */}
              <option value="">Move to…</option>
              {ticket.permittedTransitions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section className="zen-card" aria-labelledby="ticket-information-heading">
        <h2 id="ticket-information-heading">Ticket Information</h2>
        <div className="ticket-detail-card__grid">
          <ReadOnly id="ticketNo" label="Ticket No." value={ticket.ticketNo} />
          <ReadOnly id="ticketDate" label="Ticket Date" value={formatDate(ticket.createdAt)} />
          <ReadOnly id="requester" label="Requester" value={ticket.requester.displayName} />
          <ReadOnly id="category" label="Category" value={ticket.category.name} />
          <ReadOnly
            id="relatedSystem"
            label="Related System"
            value={ticket.relatedSystem.name}
          />
          {/* Set once by the Requester and never altered afterwards (BR-18). */}
          <ReadOnly
            id="requestedPriority"
            label="Requested Priority"
            value={ticket.requestedPriority}
          />
        </div>
        <ReadOnly id="summary" label="Summary" value={ticket.summary} />
        <FormField id="description" label="Description" readOnly>
          <textarea value={ticket.description} readOnly rows={4} />
        </FormField>
      </section>

      <div className="zen-card ticket-detail-card">
        <AttachmentSection
          ticketId={ticket.id}
          attachments={ticket.attachments}
          activeCount={activeAttachmentCount}
          activeLimit={5}
          onAdd={addAttachment}
          onRemove={removeTicketAttachment}
          onDownload={downloadTicketAttachment}
        />
      </div>

      <PublicCommentsSection ticketId={ticket.id} />
      <InternalNotesSection ticketId={ticket.id} />
    </div>
  )
}
