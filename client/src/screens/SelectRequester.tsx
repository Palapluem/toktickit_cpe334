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
    <div className="zen-card mx-auto" style={{ maxWidth: 560 }}>
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

          <p className="zen-state" style={{ textAlign: 'left' }}>
            Only active development requesters are shown.
          </p>
        </>
      ) : null}

      <p className="zen-state" style={{ textAlign: 'left' }}>
        Authentication coming in Lab 3 — in Lab 3 this selection will be replaced
        with secure authentication so you can access the system with your own
        account.
      </p>

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
