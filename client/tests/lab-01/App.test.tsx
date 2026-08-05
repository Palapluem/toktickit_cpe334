import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('UI-01: heading', () => {
  it('renders the TokTickIT IT Service Desk heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /TokTickIT IT Service Desk/i }),
    ).toBeInTheDocument()
  })
})

describe('UI-03: health check failure', () => {
  it('shows a useful error message when the backend is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network error')),
    )

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /check system/i }))

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
    expect(screen.getByText(/System Status/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Unable to connect to TokTickIT API/i),
    ).toBeInTheDocument()
  })
})
