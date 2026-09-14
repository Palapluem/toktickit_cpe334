// Public Comments and Internal Notes (ui-spec §9).
//
// Two components, not one with a visibility prop — the same reasoning as the
// server's two tables. Which thread you are posting to is a choice made at the
// call site, not a value that can be wrong at runtime.
import { useEffect, useState } from 'react'
import {
  ApiRequestError,
  fetchComments,
  fetchInternalNotes,
  postComment,
  postInternalNote,
  type ThreadEntry,
} from '../api.js'
import { RoleBadge } from './Badge.js'
import { Button } from './Button.js'
import { FormField } from './FormField.js'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function Entry({ entry, internal }: { entry: ThreadEntry; internal: boolean }) {
  return (
    <li className={`thread__entry${internal ? ' thread__entry--internal' : ''}`}>
      <p className="thread__meta">
        <span className="thread__author">{entry.author.displayName}</span>
        <RoleBadge value={entry.author.role} />
        {/* On every internal entry, not only on the section heading: an entry
            read on its own must still say what it is. */}
        {internal ? <span className="thread__internal-tag">Internal</span> : null}
        <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
      </p>
      {/* React escapes this; dangerouslySetInnerHTML is never used (SEC-029). */}
      <p className="thread__body">{entry.body}</p>
    </li>
  )
}

type ThreadProps = {
  ticketId: string
  title: string
  audience: string
  internal: boolean
  composerId: string
  composerLabel: string
  submitLabel: string
  emptyLabel: string
  load: (ticketId: string) => Promise<ThreadEntry[]>
  post: (ticketId: string, body: string) => Promise<ThreadEntry>
}

function Thread({
  ticketId,
  title,
  audience,
  internal,
  composerId,
  composerLabel,
  submitLabel,
  emptyLabel,
  load,
  post,
}: ThreadProps) {
  const [entries, setEntries] = useState<ThreadEntry[] | null>(null)
  const [refused, setRefused] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    load(ticketId)
      .then((next) => {
        if (!cancelled) setEntries(next)
      })
      .catch((cause) => {
        if (cancelled) return
        // A refused thread renders nothing at all — not a disabled section and
        // not an explanation. A Requester should not learn Internal Notes
        // exist (ui-spec §9, AC-09).
        if (cause instanceof ApiRequestError && cause.status === 403) setRefused(true)
        setEntries([])
      })
    return () => {
      cancelled = true
    }
  }, [ticketId, load])

  if (refused) return null

  async function submit() {
    const body = draft.trim()
    if (!body || busy) return

    setBusy(true)
    setError('')
    try {
      const created = await post(ticketId, body)
      setEntries((current) => [...(current ?? []), created])
      setDraft('')
    } catch (cause) {
      // The draft is kept: losing what someone typed because the network
      // failed is its own defect.
      setError(
        cause instanceof ApiRequestError ? cause.message : 'That could not be saved. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className={`zen-card thread${internal ? ' thread--internal' : ''}`}
      aria-label={title}
    >
      <h2>{title}</h2>
      <p className="thread__audience">{audience}</p>

      {entries === null ? (
        <p role="status">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="thread__empty">{emptyLabel}</p>
      ) : (
        <ul className="thread__entries">
          {entries.map((entry) => (
            <Entry key={entry.id} entry={entry} internal={internal} />
          ))}
        </ul>
      )}

      {error ? (
        <p className="zen-auth__error" role="alert">
          {error}
        </p>
      ) : null}

      <FormField id={composerId} label={composerLabel}>
        <textarea
          rows={3}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
        />
      </FormField>
      <Button variant="secondary" busy={busy} onClick={submit}>
        {submitLabel}
      </Button>
    </section>
  )
}

export function PublicCommentsSection({ ticketId }: { ticketId: string }) {
  return (
    <Thread
      ticketId={ticketId}
      title="Public Comments"
      audience="Visible to the Requester."
      internal={false}
      composerId="comment-body"
      composerLabel="Add a comment"
      submitLabel="Post Comment"
      emptyLabel="No comments yet."
      load={fetchComments}
      post={postComment}
    />
  )
}

export function InternalNotesSection({ ticketId }: { ticketId: string }) {
  return (
    <Thread
      ticketId={ticketId}
      title="Internal Notes"
      audience="IT Staff and Administrator only."
      internal
      composerId="note-body"
      composerLabel="Add an internal note"
      submitLabel="Add Internal Note"
      emptyLabel="No internal notes yet."
      load={fetchInternalNotes}
      post={postInternalNote}
    />
  )
}
