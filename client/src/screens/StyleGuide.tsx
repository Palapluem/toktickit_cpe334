// Component state gallery — Part 9 evidence in one page (Issue #19).
// It covers every state required by ui-spec §3 for the visual checklist.
import { useState } from 'react'
import { Button } from '../components/Button.js'
import { FormField } from '../components/FormField.js'
import {
  PriorityBadge,
  StatusBadge,
  type Priority,
  type TicketStatus,
} from '../components/Badge.js'
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from '../components/States.js'

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUSES: TicketStatus[] = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="zen-card mb-4" aria-labelledby={id}>
      <h2 className="zen-state__title" id={id}>
        {title}
      </h2>
      {note ? <p className="zen-field__hint mb-3">{note}</p> : null}
      {children}
    </section>
  )
}

export function StyleGuide() {
  const [busy, setBusy] = useState(false)

  return (
    <div>
      <h1 className="zen-state__title mb-3">Zen Green component states</h1>
      <p className="zen-field__hint mb-4">
        Every state <code>ui-spec.md</code> §3 requires, on one page. Used for the
        Part 9 visual checklist and the responsive captures at three viewports.
      </p>

      <Section
        id="sg-fields"
        title="Form fields"
        note="Label above the control; asterisk beside the label; message below the field."
      >
        <FormField id="sg-editable" label="Summary" required hint="5–150 characters.">
          <input id="sg-editable" defaultValue="Laptop battery drains quickly" />
        </FormField>

        <FormField id="sg-readonly" label="Ticket Number" readOnly>
          <input id="sg-readonly" defaultValue="TKT-2026-000001" />
        </FormField>

        <FormField
          id="sg-invalid"
          label="Description"
          required
          error="Description must be at least 10 characters."
        >
          <textarea id="sg-invalid" rows={3} defaultValue="help" />
        </FormField>

        <FormField id="sg-disabled" label="Ticket Owner">
          <input id="sg-disabled" disabled defaultValue="Unassigned" />
        </FormField>
      </Section>

      <Section
        id="sg-buttons"
        title="Buttons"
        note="Exactly one primary per screen. Busy disables as well as announcing."
      >
        <div className="d-flex flex-wrap gap-2 mb-3">
          <Button variant="primary">Submit Ticket</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="tertiary">Clear Filters</Button>
          <Button variant="destructive">Remove Attachment</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <Button
          variant="primary"
          busy={busy}
          busyLabel="Submitting…"
          onClick={() => {
            setBusy(true)
            window.setTimeout(() => setBusy(false), 2000)
          }}
        >
          Click to see the busy state
        </Button>
      </Section>

      <Section
        id="sg-badges"
        title="Badges"
        note="Every badge carries its text label; colour is supporting information only."
      >
        <div className="d-flex flex-wrap gap-2 mb-3">
          {PRIORITIES.map((value) => (
            <PriorityBadge key={value} value={value} />
          ))}
        </div>
        <div className="d-flex flex-wrap gap-2">
          {STATUSES.map((value) => (
            <StatusBadge key={value} value={value} />
          ))}
        </div>
      </Section>

      <Section
        id="sg-states"
        title="Loading, empty, and error"
        note="Empty and error say what happened and what to do next."
      >
        <div className="d-flex flex-column gap-3">
          <LoadingState label="Loading tickets…" />
          <EmptyState
            title="You have no tickets yet"
            detail="Create your first ticket to get started."
            action={<Button variant="primary">Create Ticket</Button>}
          />
          <ErrorState
            title="Could not load tickets"
            detail="The server did not respond. Your filters have been kept."
            onRetry={() => undefined}
          />
        </div>
      </Section>
    </div>
  )
}
