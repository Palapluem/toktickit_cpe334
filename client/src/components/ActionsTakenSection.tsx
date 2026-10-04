// Actions Taken on Ticket Detail (lab-04 ui-spec §5): the list, create mode, the detail panel with edit and the
// status moves, and every feedback state. The server decides everything; this shows what it decided.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ApiRequestError,
  createAction,
  fetchActions,
  moveAction,
  updateAction,
  type ActionPerson,
  type ActionTaken,
  type AssignableOwner,
  type TicketStatus,
} from '../api.js'
import { statusLabel } from '../ticketLabels.js'
import { ActionStatusBadge } from './Badge.js'
import { Button } from './Button.js'
import { FormField } from './FormField.js'
import { Modal } from './Modal.js'

export type ActionsTakenSectionProps = {
  ticketId: string
  ticketStatus: TicketStatus
  audience: 'staff' | 'requester'
  assignableOwners?: AssignableOwner[]
  currentUserId?: string
  /** Called after a change so the Ticket (version, status, history) is reloaded. */
  onChanged?: () => void
}

const WORKING: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']
const TEXT_MAX = 2000
const NOTES_MAX = 500
const REASON_MAX = 500
const FAILED = 'The Action could not be saved. Your entries are kept.'
const CONFLICT = 'Someone else changed this Action. The latest version is shown; your unsaved entries are kept in the form.'
const TERMINAL = 'This Action is already completed or cancelled.'

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

const nameOf = (person: ActionPerson | null): string => person?.displayName ?? '—'
const isFinished = (action: ActionTaken): boolean => action.status === 'COMPLETED' || action.status === 'CANCELLED'

type Values = {
  description: string
  assigneeId: string
  followUpRequired: boolean
  followUpNote: string
  attachmentNotes: string
  result: string
}
type Errors = Partial<Record<keyof Values, string>>

function check(values: Values, editing: boolean): Errors {
  const errors: Errors = {}
  const description = values.description.trim()
  if (!description) errors.description = 'Enter a description.'
  else if (description.length > TEXT_MAX) errors.description = `Keep the description to ${TEXT_MAX} characters or fewer.`
  if (!values.assigneeId) errors.assigneeId = 'Choose who will do this.'
  if (values.followUpRequired) {
    const note = values.followUpNote.trim()
    if (!note) errors.followUpNote = 'Enter the follow-up note.'
    else if (note.length > TEXT_MAX) errors.followUpNote = `Keep the follow-up note to ${TEXT_MAX} characters or fewer.`
  }
  if (values.attachmentNotes.trim().length > NOTES_MAX) errors.attachmentNotes = `Keep the attachment notes to ${NOTES_MAX} characters or fewer.`
  if (editing && values.result.trim().length > TEXT_MAX) errors.result = `Keep the result to ${TEXT_MAX} characters or fewer.`
  return errors
}

const orNull = (value: string): string | null => (value.trim() === '' ? null : value.trim())

/** One form for both modes: a new Action, or an edit of a non-terminal one. */
function ActionForm({
  action,
  owners,
  currentUserId,
  onSave,
  onSaved,
  onClose,
  onReload,
  onOwnersStale,
  onFinal,
}: {
  action?: ActionTaken
  owners: AssignableOwner[]
  currentUserId: string
  onSave: (values: Values, requestId: string, version: number) => Promise<ActionTaken>
  onSaved: (saved: ActionTaken) => void
  onClose: () => void
  onReload: () => void
  onOwnersStale: () => void
  /** The Action turned out to be finished: the panel, not the form, says so, because the form goes away. */
  onFinal?: () => void
}) {
  const editing = action !== undefined
  const [values, setValues] = useState<Values>({
    description: action?.description ?? '',
    assigneeId: action?.assignee.id ?? currentUserId,
    followUpRequired: action?.followUpRequired ?? false,
    followUpNote: action?.followUpNote ?? '',
    attachmentNotes: action?.attachmentNotes ?? '',
    result: action?.result ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [banner, setBanner] = useState('')
  const [retryable, setRetryable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(action?.version ?? 0)
  // One submission, one request id: a retry resends it, so a lost response cannot create a second Action (BR-34).
  const requestId = useRef(crypto.randomUUID())
  const inFlight = useRef(false)
  const first = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    first.current?.focus()
  }, [])

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((current) => ({ ...current, [key]: value }))

  async function submit() {
    if (inFlight.current) return
    const found = check(values, editing)
    setErrors(found)
    setBanner('')
    setRetryable(false)
    if (Object.keys(found).length > 0) return

    inFlight.current = true
    setBusy(true)
    try {
      onSaved(await onSave(values, requestId.current, version))
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.code : undefined
      if (code === 'VALIDATION_FAILED' && error instanceof ApiRequestError) {
        const mapped: Errors = {}
        for (const { field, message } of error.fieldErrors) if (field in values) mapped[field as keyof Values] = message
        setErrors(mapped)
        if (Object.keys(mapped).length === 0) setBanner(error.message)
      } else if (code === 'ASSIGNEE_NOT_ELIGIBLE') {
        setErrors({ assigneeId: 'Choose an active IT Staff member or Administrator.' })
        onOwnersStale()
      } else if (code === 'STALE_VERSION' && error instanceof ApiRequestError) {
        const latest = error.details?.currentVersion
        if (typeof latest === 'number') setVersion(latest)
        setBanner(CONFLICT)
        onReload()
      } else if (code === 'ACTION_TERMINAL') {
        setBanner(TERMINAL)
        onFinal?.()
        onReload()
      } else if (error instanceof ApiRequestError && error.status !== undefined && error.status < 500) {
        setBanner(error.message)
        if (code === 'TICKET_NOT_WORKABLE') onOwnersStale()
      } else {
        setBanner(FAILED)
        setRetryable(true)
      }
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <form
      className="actions__form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {banner ? (
        <p className="zen-auth__error" role="alert">
          {banner}
        </p>
      ) : null}

      <FormField
        id={editing ? 'edit-description' : 'new-description'}
        label="Description"
        required
        error={errors.description}
        hint={`${values.description.length} / ${TEXT_MAX}`}
      >
        <textarea ref={first} rows={3} value={values.description} disabled={busy} onChange={(event) => set('description', event.target.value)} />
      </FormField>

      <FormField id={editing ? 'edit-assignee' : 'new-assignee'} label="Assignee" required error={errors.assigneeId}>
        <select value={values.assigneeId} disabled={busy} onChange={(event) => set('assigneeId', event.target.value)}>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.displayName}
            </option>
          ))}
        </select>
      </FormField>

      {editing ? (
        <FormField id="edit-result" label="Result" error={errors.result} hint={`${values.result.length} / ${TEXT_MAX}`}>
          <textarea rows={3} value={values.result} disabled={busy} onChange={(event) => set('result', event.target.value)} />
        </FormField>
      ) : null}

      <label className="actions__checkbox">
        <input
          type="checkbox"
          checked={values.followUpRequired}
          disabled={busy}
          // Unticking hides the note and clears it (BR-14).
          onChange={(event) => setValues((current) => ({ ...current, followUpRequired: event.target.checked, followUpNote: '' }))}
        />
        Follow-Up Required?
      </label>
      {values.followUpRequired ? (
        <FormField
          id={editing ? 'edit-follow-up-note' : 'new-follow-up-note'}
          label="Follow-up Note"
          required
          error={errors.followUpNote}
          hint={`${values.followUpNote.length} / ${TEXT_MAX}`}
        >
          <textarea rows={2} value={values.followUpNote} disabled={busy} onChange={(event) => set('followUpNote', event.target.value)} />
        </FormField>
      ) : null}

      <FormField
        id={editing ? 'edit-attachment-notes' : 'new-attachment-notes'}
        label="Attachment Notes"
        error={errors.attachmentNotes}
        hint="Name the attached file to look at, for example relay-error.png."
      >
        <input value={values.attachmentNotes} disabled={busy} onChange={(event) => set('attachmentNotes', event.target.value)} />
      </FormField>

      {editing ? null : (
        <dl className="actions__system">
          <div>
            <dt>Action Date/Time</dt>
            <dd>Recorded automatically when you save</dd>
          </div>
          <div>
            <dt>Performed by</dt>
            <dd>{owners.find((owner) => owner.id === currentUserId)?.displayName ?? '—'}</dd>
          </div>
        </dl>
      )}

      <div className="actions__buttons">
        <Button type="submit" variant="primary" busy={busy} busyLabel="Saving…">
          {editing ? 'Save changes' : 'Save Action'}
        </Button>
        {retryable ? (
          <Button variant="secondary" disabled={busy} onClick={() => void submit()}>
            Try again
          </Button>
        ) : null}
        <Button variant="tertiary" disabled={busy} onClick={onClose}>
          {editing ? 'Discard' : 'Cancel'}
        </Button>
      </div>
    </form>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="actions__fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** The inline detail panel. System fields are text here, never inputs (STY-009, STY-010). */
function ActionPanel({
  ticketId,
  action,
  controls,
  owners,
  currentUserId,
  onClose,
  onChanged,
  onReload,
  onOwnersStale,
}: {
  ticketId: string
  action: ActionTaken
  controls: boolean
  owners: AssignableOwner[]
  currentUserId: string
  onClose: () => void
  onChanged: () => void
  onReload: () => void
  onOwnersStale: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const resultField = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [result, setResult] = useState(action.result ?? '')
  const [resultError, setResultError] = useState('')
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const finished = isFinished(action)
  const staffControls = controls && !finished
  const showForm = editing && !finished

  useEffect(() => {
    heading.current?.focus()
  }, [action.id])

  async function move(body: Parameters<typeof moveAction>[2]) {
    if (busy) return false
    setBusy(true)
    setBanner('')
    try {
      await moveAction(ticketId, action.id, body)
      onChanged()
      return true
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.code : undefined
      if (code === 'STALE_VERSION') {
        setBanner(CONFLICT)
        onReload()
      } else if (code === 'ACTION_TERMINAL') {
        setBanner(TERMINAL)
        onReload()
      } else if (error instanceof ApiRequestError && error.status !== undefined && error.status < 500) {
        setBanner(error.message)
        if (code === 'TICKET_NOT_WORKABLE') onOwnersStale()
      } else {
        setBanner('The change could not be saved. Try again.')
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  async function complete() {
    const typed = result.trim()
    if (!typed && !(action.result ?? '').trim()) {
      setResultError('Enter the result before completing this Action.')
      resultField.current?.focus()
      return
    }
    setResultError('')
    await move(typed ? { expectedVersion: action.version, status: 'COMPLETED', result: typed } : { expectedVersion: action.version, status: 'COMPLETED' })
  }

  async function confirmCancel() {
    const text = reason.trim()
    if (!text) return setReasonError('Enter the reason for cancelling.')
    if (text.length > REASON_MAX) return setReasonError(`Keep the reason to ${REASON_MAX} characters or fewer.`)
    setReasonError('')
    if (await move({ expectedVersion: action.version, status: 'CANCELLED', cancellationReason: text })) setCancelling(false)
  }

  return (
    <section className="actions__panel" aria-labelledby={`action-panel-${action.id}`}>
      <h3 id={`action-panel-${action.id}`} ref={heading} tabIndex={-1}>
        Action details
      </h3>
      {banner ? (
        <p className="zen-auth__error" role="alert">
          {banner}
        </p>
      ) : null}

      {showForm ? (
        <ActionForm
          action={action}
          owners={owners}
          currentUserId={currentUserId}
          onSave={(values, _requestId, version) =>
            updateAction(ticketId, action.id, {
              expectedVersion: version,
              description: values.description.trim(),
              result: orNull(values.result),
              followUpRequired: values.followUpRequired,
              followUpNote: values.followUpRequired ? values.followUpNote.trim() : null,
              attachmentNotes: orNull(values.attachmentNotes),
              assigneeId: values.assigneeId,
            })
          }
          onSaved={() => {
            setEditing(false)
            onChanged()
          }}
          onClose={() => setEditing(false)}
          onReload={onReload}
          onOwnersStale={onOwnersStale}
          onFinal={() => setBanner(TERMINAL)}
        />
      ) : (
        <dl className="actions__facts">
          <Fact label="Action Date/Time">{formatDate(action.actionAt)}</Fact>
          <Fact label="Performed by">{nameOf(action.performedBy)}</Fact>
          <Fact label="Status">
            <ActionStatusBadge value={action.status} />
          </Fact>
          <Fact label="Assignee">
            {nameOf(action.assignee)}
            {action.assignee.isActive === false ? <> <span>(inactive)</span></> : null}
          </Fact>
          <Fact label="Description">{action.description}</Fact>
          {action.followUpRequired ? <Fact label="Follow-up Note">{action.followUpNote}</Fact> : <Fact label="Follow-Up Required?">No</Fact>}
          {action.attachmentNotes ? <Fact label="Attachment Notes">{action.attachmentNotes}</Fact> : null}
          {action.status !== 'IN_PROGRESS' || !staffControls ? <Fact label="Result">{action.result ?? '—'}</Fact> : null}
          {action.status === 'COMPLETED' ? (
            <>
              <Fact label="Completed by">{nameOf(action.completedBy)}</Fact>
              <Fact label="Completed at">{action.completedAt ? formatDate(action.completedAt) : '—'}</Fact>
            </>
          ) : null}
          {action.status === 'CANCELLED' ? (
            <>
              <Fact label="Cancelled by">{nameOf(action.cancelledBy)}</Fact>
              <Fact label="Cancelled at">{action.cancelledAt ? formatDate(action.cancelledAt) : '—'}</Fact>
              <Fact label="Cancellation reason">{action.cancellationReason}</Fact>
            </>
          ) : null}
        </dl>
      )}

      {staffControls && !showForm && action.status === 'IN_PROGRESS' ? (
        <FormField id="complete-result" label="Result" error={resultError} hint="Required to complete this Action.">
          <textarea ref={resultField} rows={3} value={result} disabled={busy} onChange={(event) => setResult(event.target.value)} />
        </FormField>
      ) : null}

      <div className="actions__buttons">
        {staffControls && !showForm ? (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </Button>
            {action.status === 'PLANNED' ? (
              <Button variant="primary" busy={busy} onClick={() => void move({ expectedVersion: action.version, status: 'IN_PROGRESS' })}>
                Start
              </Button>
            ) : null}
            {action.status === 'IN_PROGRESS' ? (
              <Button variant="primary" busy={busy} onClick={() => void complete()}>
                Complete
              </Button>
            ) : null}
            <Button variant="destructive" disabled={busy} onClick={() => setCancelling(true)}>
              Cancel Action
            </Button>
          </>
        ) : null}
        <Button variant="tertiary" onClick={onClose}>
          Close
        </Button>
      </div>

      {cancelling ? (
        <Modal title="Cancel this Action?" onClose={() => setCancelling(false)}>
          {banner ? (
            <p className="zen-auth__error" role="alert">
              {banner}
            </p>
          ) : null}
          <FormField id="cancel-reason" label="Reason" required error={reasonError} hint={`${reason.length} / ${REASON_MAX}`}>
            <textarea rows={3} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} />
          </FormField>
          <div className="zen-modal__actions">
            <Button variant="tertiary" disabled={busy} onClick={() => setCancelling(false)}>
              Keep Action
            </Button>
            <Button variant="destructive" busy={busy} onClick={() => void confirmCancel()}>
              Cancel Action
            </Button>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}

export function ActionsTakenSection({
  ticketId,
  ticketStatus,
  audience,
  assignableOwners = [],
  currentUserId = '',
  onChanged,
}: ActionsTakenSectionProps) {
  const [actions, setActions] = useState<ActionTaken[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [panel, setPanel] = useState<{ kind: 'none' } | { kind: 'create' } | { kind: 'view'; id: string }>({ kind: 'none' })
  const staff = audience === 'staff'
  const workable = WORKING.includes(ticketStatus)

  useEffect(() => {
    let cancelled = false
    fetchActions(ticketId)
      .then((next) => {
        if (cancelled) return
        setActions(next)
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [ticketId, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const changed = useCallback(() => {
    reload()
    onChanged?.()
  }, [reload, onChanged])

  const viewing = panel.kind === 'view' ? actions?.find((candidate) => candidate.id === panel.id) : undefined

  return (
    <section className="zen-card actions" id="actions-taken" aria-labelledby="actions-heading">
      <div className="actions__header">
        <h2 id="actions-heading">{actions ? `Actions Taken (${actions.length})` : 'Actions Taken'}</h2>
        {staff && workable && panel.kind !== 'create' ? (
          <Button variant="primary" onClick={() => setPanel({ kind: 'create' })}>
            Add Action
          </Button>
        ) : null}
      </div>
      {staff ? <p className="actions__hint">Actions are visible to the Requester. Use Internal Notes for private information.</p> : null}
      {staff && !workable ? (
        <p className="actions__banner" role="status">
          This Ticket is {statusLabel(ticketStatus)}. Actions are read-only — reopen the Ticket to record more work.
        </p>
      ) : null}

      {panel.kind === 'create' ? (
        <ActionForm
          owners={assignableOwners}
          currentUserId={currentUserId}
          onSave={(values, requestId) =>
            createAction(ticketId, {
              requestId,
              description: values.description.trim(),
              assigneeId: values.assigneeId,
              followUpRequired: values.followUpRequired,
              followUpNote: values.followUpRequired ? values.followUpNote.trim() : null,
              attachmentNotes: orNull(values.attachmentNotes),
            })
          }
          onSaved={() => {
            setPanel({ kind: 'none' })
            changed()
          }}
          onClose={() => setPanel({ kind: 'none' })}
          onReload={reload}
          onOwnersStale={() => onChanged?.()}
        />
      ) : null}

      {failed ? (
        <div role="alert">
          <p>The Actions could not be loaded.</p>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : actions === null ? (
        <p role="status">Loading…</p>
      ) : actions.length === 0 ? (
        <p className="actions__empty">No Actions have been recorded yet.</p>
      ) : (
        <div className="zen-scroll-x">
          <table className="my-tickets__table actions__table">
            <thead>
              <tr>
                <th scope="col">Date/Time</th>
                <th scope="col">Description</th>
                <th scope="col">Assignee</th>
                <th scope="col">Performed by</th>
                <th scope="col">Status</th>
                <th scope="col">Follow-up</th>
                <th scope="col" aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {actions.map((action) => (
                <tr key={action.id} id={`action-${action.id}`}>
                  <td data-label="Date/Time">{formatDate(action.actionAt)}</td>
                  <td data-label="Description">
                    <span className="actions__clamp">{action.description}</span>
                  </td>
                  <td data-label="Assignee">
                    {nameOf(action.assignee)}
                    {staff && action.assignee.isActive === false ? <> <span>(inactive)</span></> : null}
                  </td>
                  <td data-label="Performed by">{nameOf(action.performedBy)}</td>
                  <td data-label="Status">
                    <ActionStatusBadge value={action.status} />
                  </td>
                  <td data-label="Follow-up">{action.followUpRequired ? 'Required' : '—'}</td>
                  <td>
                    <Button
                      variant="secondary"
                      aria-label={`View Action from ${formatDate(action.actionAt)}`}
                      onClick={() => setPanel({ kind: 'view', id: action.id })}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing ? (
        <ActionPanel
          key={viewing.id}
          ticketId={ticketId}
          action={viewing}
          controls={staff && workable}
          owners={assignableOwners}
          currentUserId={currentUserId}
          onClose={() => setPanel({ kind: 'none' })}
          onChanged={changed}
          onReload={reload}
          onOwnersStale={() => onChanged?.()}
        />
      ) : null}
    </section>
  )
}
