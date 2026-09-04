import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react'
import type { TicketAttachment } from '../api.js'
import { Button } from './Button.js'

export type AttachmentSectionProps = {
  ticketId: string
  requesterId: string
  attachments: TicketAttachment[]
  activeCount: number
  activeLimit: number
  onAdd: (file: File) => Promise<TicketAttachment>
  onRemove: (attachmentId: string, reason: string) => Promise<TicketAttachment>
  onDownload: (attachmentId: string) => Promise<void>
}

type InvalidUpload = { filename: string; message: string }

const ACCEPTED_FILES = '.jpg,.jpeg,.png,.webp,.pdf'

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function fileTypeLabel(mimeType: string): string {
  return mimeType.split('/').pop()?.toUpperCase() ?? 'FILE'
}

export function AttachmentSection({
  ticketId,
  requesterId,
  attachments,
  activeCount,
  activeLimit,
  onAdd,
  onRemove,
  onDownload,
}: AttachmentSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState(attachments)
  const [currentActiveCount, setCurrentActiveCount] = useState(activeCount)
  const [uploading, setUploading] = useState(false)
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(null)
  const [invalidUpload, setInvalidUpload] = useState<InvalidUpload | null>(null)
  const [downloadError, setDownloadError] = useState('')
  const [removing, setRemoving] = useState<TicketAttachment | null>(null)
  const [reason, setReason] = useState('')
  const [removingInProgress, setRemovingInProgress] = useState(false)

  const closeDialog = useCallback(() => {
    if (removingInProgress) return
    setRemoving(null)
    setReason('')
  }, [removingInProgress])

  useEffect(() => {
    setRows(attachments)
    setCurrentActiveCount(activeCount)
  }, [attachments, activeCount])

  useEffect(() => {
    if (!removing) {
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
      return
    }

    const firstControl = dialogRef.current?.querySelector<HTMLElement>(
      'input, button:not([disabled])',
    )
    firstControl?.focus()

    function trapFocus(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDialog()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'input, button:not([disabled])',
        ),
      )
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => document.removeEventListener('keydown', trapFocus)
  }, [closeDialog, removing])

  function openDialog(attachment: TicketAttachment, event: MouseEvent<HTMLButtonElement>) {
    restoreFocusRef.current = event.currentTarget
    setReason('')
    setRemoving(attachment)
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setInvalidUpload(null)
    setUploadingFilename(file.name)
    setUploading(true)
    try {
      const attachment = await onAdd(file)
      setRows((current) => [...current, attachment])
      setCurrentActiveCount((current) => current + 1)
    } catch (error) {
      setInvalidUpload({
        filename: file.name,
        message:
          error instanceof Error && error.message
            ? error.message
            : 'This attachment could not be uploaded. Try again or choose another file.',
      })
    } finally {
      setUploading(false)
      setUploadingFilename(null)
    }
  }

  async function confirmRemoval() {
    if (!removing || reason.trim().length < 3 || removingInProgress) return
    setRemovingInProgress(true)
    try {
      const removed = await onRemove(removing.id, reason.trim())
      setRows((current) => current.map((row) => (row.id === removed.id ? removed : row)))
      setCurrentActiveCount((current) => Math.max(0, current - 1))
      setRemoving(null)
      setReason('')
    } catch {
      setDownloadError('The attachment could not be removed. Try again.')
    } finally {
      setRemovingInProgress(false)
    }
  }

  async function download(attachment: TicketAttachment) {
    setDownloadError('')
    try {
      await onDownload(attachment.id)
    } catch {
      setDownloadError('The attachment is currently unavailable for download.')
    }
  }

  const atLimit = currentActiveCount >= activeLimit

  return (
    <section
      className="attachment-section"
      data-ticket-id={ticketId}
      data-requester-id={requesterId}
    >
      <div className="attachment-section__header">
        <div>
          <h2 aria-label="Attachments">Attachments ({currentActiveCount} of {activeLimit})</h2>
          <p className="zen-field__hint">
            JPG, PNG, WEBP, or PDF · up to 5 MB each
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            className="attachment-section__file-input"
            type="file"
            accept={ACCEPTED_FILES}
            aria-label="Attachment file"
            onChange={handleUpload}
            disabled={atLimit || uploading}
          />
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={atLimit || uploading}
            busy={uploading}
            busyLabel="Uploading…"
            title={atLimit ? 'Five active attachments already exist.' : undefined}
          >
            Add Attachment
          </Button>
        </div>
      </div>

      {downloadError ? (
        <p className="zen-field__error" role="alert">{downloadError}</p>
      ) : null}

      {invalidUpload ? (
        <div className="attachment-section__invalid" role="alert">
          <div>
            <strong>{invalidUpload.filename}</strong>
            <p>{invalidUpload.message}</p>
          </div>
          <Button variant="tertiary" onClick={() => setInvalidUpload(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {rows.length > 0 || uploadingFilename ? (
        <ul className="attachment-section__list">
          {uploadingFilename ? (
            <li className="attachment-section__row attachment-section__row--uploading">
              <div className="attachment-section__identity">
                <span className="attachment-section__type" aria-hidden="true">
                  FILE
                </span>
                <div>
                  <strong className="attachment-section__filename">
                    {uploadingFilename}
                  </strong>
                  <p className="attachment-section__metadata">Uploading…</p>
                </div>
              </div>
              <progress
                aria-label={`Uploading ${uploadingFilename}`}
                className="attachment-section__progress"
              />
            </li>
          ) : null}
          {rows.map((attachment) => {
            const removed = attachment.removedAt !== null
            return (
              <li
                className={`attachment-section__row${removed ? ' attachment-section__row--removed' : ''}`}
                key={attachment.id}
              >
                <div className="attachment-section__identity">
                  <span className="attachment-section__type" aria-hidden="true">
                    {fileTypeLabel(attachment.mimeType)}
                  </span>
                  <div>
                    {removed ? (
                      <span className="attachment-section__filename">
                        {attachment.originalFilename}
                      </span>
                    ) : (
                      <a
                        className="attachment-section__download-link"
                        href="#"
                        aria-label={`Download ${attachment.originalFilename}`}
                        onClick={(event) => {
                          event.preventDefault()
                          void download(attachment)
                        }}
                      >
                        {attachment.originalFilename}
                      </a>
                    )}
                    <p className="attachment-section__metadata">
                      {fileTypeLabel(attachment.mimeType)} · {formatBytes(attachment.sizeBytes)} · uploaded {formatDate(attachment.createdAt)}
                    </p>
                    {removed ? (
                      <p className="attachment-section__removed-detail">
                        <span className="zen-badge">Removed</span>{' '}
                        <span className="attachment-section__removed-reason">
                          {attachment.removedReason ?? 'No reason provided'}
                        </span>{' · '}
                        <span>
                          {formatDate(attachment.removedAt ?? attachment.createdAt)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
                {!removed ? (
                  <Button
                    variant="destructive"
                    onClick={(event) => openDialog(attachment, event)}
                    aria-label={`Remove ${attachment.originalFilename}`}
                  >
                    Remove
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="attachment-section__empty">No attachments have been added.</p>
      )}

      {removing ? (
        <div className="attachment-section__dialog-layer">
          <div className="attachment-section__dialog-backdrop" aria-hidden="true" />
          <div className="attachment-section__dialog" role="dialog" aria-modal="true" aria-labelledby="remove-attachment-heading" ref={dialogRef}>
            <h3 id="remove-attachment-heading">Remove attachment?</h3>
            <p>{removing.originalFilename}</p>
            <label className="zen-field__label" htmlFor="removal-reason">Removal reason</label>
            <input
              id="removal-reason"
              className="zen-field__control"
              aria-required="true"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={200}
            />
            <p className="zen-field__hint">Enter 3–200 characters.</p>
            <div className="attachment-section__dialog-actions">
              <Button variant="secondary" onClick={closeDialog} disabled={removingInProgress}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRemoval}
                disabled={reason.trim().length < 3}
                busy={removingInProgress}
                busyLabel="Removing…"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
