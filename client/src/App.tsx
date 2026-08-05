import { useState } from 'react'
import { fetchHealth } from './api.js'

type SystemState = 'idle' | 'loading' | 'online' | 'offline'

function App() {
  const [systemState, setSystemState] = useState<SystemState>('idle')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  async function handleCheckSystem() {
    setSystemState('loading')

    try {
      await fetchHealth()
      setSystemState('online')
    } catch (error) {
      console.error('Health check failed:', error)
      setErrorDetail(error instanceof Error ? error.message : 'Unknown error')
      setSystemState('offline')
    }
  }

  return (
    <div className="container py-5">
      <nav className="navbar navbar-dark bg-dark rounded px-3 mb-4">
        <span className="navbar-brand mb-0 h1">TokTickIT</span>
      </nav>

      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="card-title">TokTickIT IT Service Desk</h1>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCheckSystem}
            disabled={systemState === 'loading'}
          >
            {systemState === 'loading' ? 'Checking…' : 'Check System'}
          </button>

          {systemState === 'online' && (
            <p className="mt-3 mb-0">
              System Status: <strong className="text-success">Online</strong>
            </p>
          )}

          {systemState === 'offline' && (
            <div className="mt-3">
              <p className="mb-1">
                System Status: <strong className="text-danger">Offline</strong>
              </p>
              <p className="text-danger mb-0">
                Unable to connect to TokTickIT API
              </p>
              {errorDetail && (
                <p className="text-muted small mb-0">Details: {errorDetail}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
