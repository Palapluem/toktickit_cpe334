import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ApiRequestError,
  createTicket,
  fetchCategories,
  fetchRelatedSystems,
  type Category,
  type Priority,
  type RelatedSystem,
  type Ticket,
} from '../api.js'
import { Button } from '../components/Button.js'
import { FormField } from '../components/FormField.js'
import { ErrorState, LoadingState } from '../components/States.js'
import { useRequester } from '../context/RequesterContext.js'

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const MAX_ATTACHMENTS = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024
const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

type FormValues = {
  categoryId: string
  relatedSystemId: string
  requestedPriority: Priority | ''
  summary: string
  description: string
  attachments: File[]
}

type FieldName =
  | 'categoryId'
  | 'relatedSystemId'
  | 'requestedPriority'
  | 'summary'
  | 'description'

type AttachmentIssue = { file: File; reason: string }

const EMPTY_FORM: FormValues = {
  categoryId: '',
  relatedSystemId: '',
  requestedPriority: '',
  summary: '',
  description: '',
  attachments: [],
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return 'The file exceeds the 5 MB limit.'
  const extension = file.name
    .slice(file.name.lastIndexOf('.'))
    .toLowerCase()
  if (!MIME_BY_EXTENSION[extension] || file.type !== MIME_BY_EXTENSION[extension]) {
    return 'Not permitted. Permitted types: JPG, JPEG, PNG, WEBP, or PDF.'
  }
  return null
}

function validateForm(values: FormValues): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {}
  if (!values.categoryId) errors.categoryId = 'Choose a category.'
  if (!values.relatedSystemId) errors.relatedSystemId = 'Choose a related system.'
  if (!PRIORITIES.includes(values.requestedPriority as Priority)) {
    errors.requestedPriority = 'Choose a requested priority.'
  }
  const summary = values.summary.trim()
  if (!summary) errors.summary = 'Summary is required.'
  else if (summary.length < 5 || summary.length > 150) {
    errors.summary = 'Summary must be between 5 and 150 characters.'
  }
  const description = values.description.trim()
  if (!description) errors.description = 'Description is required.'
  else if (description.length < 10 || description.length > 5000) {
    errors.description = 'Description must be between 10 and 5000 characters.'
  }
  return errors
}

function mapServerErrors(
  fieldErrors: Array<{ field: string; message: string }>,
): Partial<Record<FieldName, string>> {
  const mapped: Partial<Record<FieldName, string>> = {}
  for (const error of fieldErrors) {
    if (
      error.field === 'categoryId' ||
      error.field === 'relatedSystemId' ||
      error.field === 'requestedPriority' ||
      error.field === 'summary' ||
      error.field === 'description'
    ) {
      mapped[error.field] = error.message
    }
  }
  return mapped
}

export function CreateTicket() {
  const { requester } = useRequester()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([])
  const [referencePhase, setReferencePhase] = useState<
    'loading' | 'loaded' | 'failed'
  >('loading')
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({})
  const [attachmentIssues, setAttachmentIssues] = useState<AttachmentIssue[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null)

  const loadReferences = useCallback(() => {
    if (!requester) return
    setReferencePhase('loading')
    Promise.all([
      fetchCategories(requester.id),
      fetchRelatedSystems(requester.id),
    ])
      .then(([nextCategories, nextRelatedSystems]) => {
        setCategories(nextCategories)
        setRelatedSystems(nextRelatedSystems)
        setReferencePhase('loaded')
      })
      .catch(() => setReferencePhase('failed'))
  }, [requester])

  useEffect(() => {
    loadReferences()
  }, [loadReferences])

  function updateField(field: FieldName, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setApiError('')
  }

  function handleFiles(files: FileList | null) {
    const accepted: File[] = []
    const rejected: AttachmentIssue[] = []
    for (const file of Array.from(files ?? [])) {
      const reason = validateFile(file)
      if (reason) rejected.push({ file, reason })
      else if (form.attachments.length + accepted.length < MAX_ATTACHMENTS) {
        accepted.push(file)
      } else {
        rejected.push({ file, reason: 'The maximum of 5 files is reached.' })
      }
    }
    setForm((current) => ({
      ...current,
      attachments: [...current.attachments, ...accepted],
    }))
    setAttachmentIssues((current) => [...current, ...rejected])
  }

  function removeFile(index: number) {
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter((_, fileIndex) => fileIndex !== index),
    }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requester || referencePhase !== 'loaded' || submitting) return

    const nextErrors = validateForm(form)
    setFieldErrors(nextErrors)
    setApiError('')
    const firstInvalid = Object.keys(nextErrors)[0] as FieldName | undefined
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const ticket = await createTicket(
        {
          categoryId: form.categoryId,
          relatedSystemId: form.relatedSystemId,
          requestedPriority: form.requestedPriority as Priority,
          summary: form.summary.trim(),
          description: form.description.trim(),
          attachments: form.attachments,
        },
        requester.id,
      )
      setCreatedTicket(ticket)
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setFieldErrors(mapServerErrors(error.fieldErrors))
      }
      setApiError('Could not create the ticket. Check the form and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function createAnother() {
    setCreatedTicket(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setAttachmentIssues([])
    setApiError('')
  }

  const controlsDisabled = submitting || referencePhase !== 'loaded'

  return (
    <div className="create-ticket-page">
      <div className="create-ticket-page__intro">
        <p className="zen-page-kicker">Requester workspace</p>
        <h1>Create Ticket</h1>
        <p>Tell the IT team what you need help with.</p>
      </div>

      {referencePhase === 'failed' ? (
        <ErrorState
          title="Could not load reference data"
          detail="Categories and related systems are unavailable. Try again before submitting."
          onRetry={loadReferences}
        />
      ) : null}

      {referencePhase === 'loading' ? (
        <LoadingState label="Loading reference data…" />
      ) : null}

      {createdTicket ? (
        <div className="zen-state zen-state--success" role="alert">
          <p className="zen-state__title">Ticket created</p>
          <p className="zen-state__detail">
            Your Ticket Number is <strong>{createdTicket.ticketNo}</strong>.
          </p>
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            <Link className="zen-button zen-button--primary" to={`/tickets/${createdTicket.id}`}>
              View Ticket
            </Link>
            <Button variant="secondary" onClick={createAnother}>
              Create Another
            </Button>
          </div>
        </div>
      ) : null}

      {apiError ? (
        <div className="zen-state zen-state--error create-ticket-page__alert" role="alert">
          <p className="zen-state__title">Could not create ticket</p>
          <p className="zen-state__detail">{apiError}</p>
        </div>
      ) : null}

      <form className="zen-card create-ticket-form" onSubmit={handleSubmit} noValidate>
        <section className="create-ticket-form__group" aria-labelledby="system-heading">
          <h2 id="system-heading">System-generated</h2>
          <div className="create-ticket-form__system-grid">
            <FormField id="ticketNo" label="Ticket No." readOnly>
              <input value={createdTicket?.ticketNo ?? 'Generated after submission'} readOnly disabled={submitting} />
            </FormField>
            <FormField id="ticketDate" label="Ticket Date" readOnly>
              <input
                value={createdTicket ? new Date(createdTicket.createdAt).toLocaleString() : 'Set on submission'}
                readOnly
                disabled={submitting}
              />
            </FormField>
            <FormField id="requester" label="Requester" readOnly>
              <input value={requester?.displayName ?? ''} readOnly disabled={submitting} />
            </FormField>
            <FormField id="currentStatus" label="Current Status" readOnly>
              <input value="New" readOnly disabled={submitting} />
            </FormField>
          </div>
        </section>

        <section className="create-ticket-form__group" aria-labelledby="classification-heading">
          <h2 id="classification-heading">Classification</h2>
          <div className="create-ticket-form__classification-grid">
            <FormField id="categoryId" label="Category" required error={fieldErrors.categoryId}>
              <select
                value={form.categoryId}
                disabled={controlsDisabled}
                onChange={(event) => updateField('categoryId', event.target.value)}
              >
                <option value="">Choose a category…</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="relatedSystemId"
              label="Related System"
              required
              error={fieldErrors.relatedSystemId}
            >
              <select
                value={form.relatedSystemId}
                disabled={controlsDisabled}
                onChange={(event) => updateField('relatedSystemId', event.target.value)}
              >
                <option value="">Choose a related system…</option>
                {relatedSystems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="requestedPriority"
              label="Requested Priority"
              required
              error={fieldErrors.requestedPriority}
            >
              <select
                value={form.requestedPriority}
                disabled={controlsDisabled}
                onChange={(event) => updateField('requestedPriority', event.target.value)}
              >
                <option value="">Choose a priority…</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="itPriority" label="IT Priority" readOnly hint="Set by IT Staff">
              <input value="Set by IT Staff" readOnly disabled={submitting} />
            </FormField>
          </div>
        </section>

        <section className="create-ticket-form__group" aria-labelledby="detail-heading">
          <h2 id="detail-heading">Detail</h2>
          <FormField id="summary" label="Summary" required error={fieldErrors.summary}>
            <input
              value={form.summary}
              disabled={controlsDisabled}
              onChange={(event) => updateField('summary', event.target.value)}
            />
          </FormField>
          <FormField
            id="description"
            label="Description"
            required
            error={fieldErrors.description}
            hint="Describe what happened, when it started, and what you have already tried."
          >
            <textarea
              rows={6}
              value={form.description}
              disabled={controlsDisabled}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </FormField>
        </section>

        <section className="create-ticket-form__group" aria-labelledby="attachments-heading">
          <h2 id="attachments-heading">Attachments</h2>
          <FormField
            id="attachments"
            label="Attachments"
            hint="JPG, PNG, WEBP, or PDF · up to 5 MB each · maximum 5 files"
          >
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              disabled={controlsDisabled}
              onChange={(event) => {
                handleFiles(event.target.files)
                event.target.value = ''
              }}
            />
          </FormField>
          {form.attachments.length || attachmentIssues.length ? (
            <ul className="create-ticket-form__file-list">
              {form.attachments.map((file, index) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <span className="zen-field__hint">{Math.ceil(file.size / 1024)} KB</span>
                  <Button
                    variant="tertiary"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(index)}
                    disabled={submitting}
                  >
                    Remove
                  </Button>
                </li>
              ))}
              {attachmentIssues.map(({ file, reason }) => (
                <li
                  className="create-ticket-form__file-list__invalid"
                  key={`${file.name}-${file.lastModified}-invalid`}
                >
                  <span>{file.name}</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="create-ticket-form__actions">
          <Button variant="secondary" type="button" onClick={() => navigate('/tickets')}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            busy={submitting}
            busyLabel="Submitting…"
            disabled={referencePhase !== 'loaded'}
          >
            Submit Ticket
          </Button>
        </div>
      </form>
    </div>
  )
}
