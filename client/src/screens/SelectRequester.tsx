// Development Requester Selection (ui-spec §6). Wording is fixed by the spec:
// this is a testing mechanism and the screen has to say so (BR-03).
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchRequesters, type Requester } from '../api.js'
import { useRequester } from '../context/RequesterContext.js'
import { Button } from '../components/Button.js'
import { FormField } from '../components/FormField.js'
import { LoadingState, ErrorState } from '../components/States.js'

type Phase = 'loading' | 'loaded' | 'failed'

export function SelectRequester() {
  const [requesters, setRequesters] = useState<Requester[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [chosenId, setChosenId] = useState('')
  const { select } = useRequester()
  const navigate = useNavigate()

  const load = useCallback(() => {
    setPhase('loading')
    fetchRequesters()
      .then((rows) => {
        setRequesters(rows)
        setPhase('loaded')
      })
      .catch(() => setPhase('failed'))
  }, [])

  useEffect(load, [load])

  function handleContinue() {
    const chosen = requesters.find((r) => r.id === chosenId)
    if (!chosen) return
    select(chosen)
    navigate('/tickets', { replace: true })
  }

  return (
    <div className="zen-card requester-selection-card mx-auto">
      <div className="requester-selection__intro-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" role="presentation">
          <circle cx="25" cy="22" r="9" />
          <path d="M9 49c1.6-8.4 7.2-13 16-13s14.4 4.6 16 13" />
          <path d="m48 28 2.1 2.2 3-.5 1.2 2.9 2.8 1.1-.5 3 2.1 2.1-2.1 2.2.5 3-2.8 1.1-1.2 2.9-3-.5L48 50l-2.1-2.2-3 .5-1.2-2.9-2.8-1.1.5-3-2.1-2.2 2.1-2.1-.5-3 2.8-1.1 1.2-2.9 3 .5L48 28Z" />
          <circle cx="48" cy="39" r="4" />
        </svg>
      </div>
      <h1 className="zen-state__title">Select Development Requester</h1>
      <p className="zen-field__hint">
        Choose a development requester to simulate the current requester context
        for Lab 2. This is for testing only and is not a login screen.
      </p>

      <hr />

      {phase === 'loading' ? (
        <LoadingState label="Loading development requesters…" />
      ) : null}

      {phase === 'failed' ? (
        <ErrorState
          title="Could not load development requesters"
          detail="The service did not respond. Nothing has been selected."
          onRetry={load}
        />
      ) : null}

      {phase === 'loaded' && requesters.length === 0 ? (
        <p className="zen-state zen-state__detail">
          No active development requesters are available. Run the database seed
          to create them.
        </p>
      ) : null}

      {phase === 'loaded' && requesters.length > 0 ? (
        <>
          <FormField id="requester" label="Development Requester" required>
            <select
              id="requester"
              value={chosenId}
              onChange={(event) => setChosenId(event.target.value)}
            >
              <option value="">Choose a requester…</option>
              {requesters.map((requester) => (
                <option key={requester.id} value={requester.id}>
                  {requester.displayName}
                </option>
              ))}
            </select>
          </FormField>

          <div className="requester-selection__callout requester-selection__callout--info" role="note">
            <span aria-hidden="true">i</span>
            <p>Only active development requesters are shown.</p>
          </div>
        </>
      ) : null}

      <div className="requester-selection__callout requester-selection__callout--shield" role="note">
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <p>
          Authentication coming in Lab 3 — in Lab 3 this selection will be replaced
          with secure authentication so you can access the system with your own
          account.
        </p>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={() => setChosenId('')}>
          Cancel
        </Button>
        <Button variant="primary" disabled={!chosenId} onClick={handleContinue}>
          Continue
        </Button>
      </div>
    </div>
  )
}
