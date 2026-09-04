// Lab 1 demonstration screen, kept as a route rather than deleted (§11.18).
// Restyled from Bootstrap colour utilities, which STY-003 forbids.
import { useState } from 'react'
import { fetchHealth, fetchCategories, type Category } from '../api.js'
import { Button } from '../components/Button.js'

type SystemState = 'idle' | 'loading' | 'online' | 'offline'

export function SystemCheck() {
  const [systemState, setSystemState] = useState<SystemState>('idle')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  async function handleCheckSystem() {
    setSystemState('loading')

    try {
      await fetchHealth()
      const fetchedCategories = await fetchCategories()
      setCategories(fetchedCategories)
      setSystemState('online')
    } catch (error) {
      console.error('Health check failed:', error)
      setErrorDetail(error instanceof Error ? error.message : 'Unknown error')
      setSystemState('offline')
    }
  }

  return (
    <div className="zen-card">
      <h1 className="zen-state__title">TokTickIT IT Service Desk</h1>

      <Button
        variant="primary"
        onClick={handleCheckSystem}
        busy={systemState === 'loading'}
        busyLabel="Checking…"
      >
        Check System
      </Button>

      {systemState === 'online' && (
        <div className="mt-3">
          <p className="mb-2">
            System Status:{' '}
            <strong style={{ color: 'var(--zen-success)' }}>Online</strong>
          </p>
          <p className="mb-1 fw-semibold">Supported Request Categories</p>
          <ol className="mb-0">
            {categories.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ol>
        </div>
      )}

      {systemState === 'offline' && (
        <div className="mt-3">
          <p className="mb-1">
            System Status:{' '}
            <strong style={{ color: 'var(--zen-error)' }}>Offline</strong>
          </p>
          <p className="mb-0" style={{ color: 'var(--zen-error)' }}>
            Unable to connect to TokTickIT API
          </p>
          {errorDetail && (
            <p className="zen-field__hint mb-0">Details: {errorDetail}</p>
          )}
        </div>
      )}
    </div>
  )
}

