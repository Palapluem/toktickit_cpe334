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

  it('logs the real error to the console for diagnostics instead of swallowing it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const thrown = new Error('network error')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(thrown))

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /check system/i }))

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Health check failed:',
        thrown,
      )
    })
    consoleError.mockRestore()
  })

  it('shows a fragment of the real error alongside the required offline message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Failed to fetch')),
    )

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /check system/i }))

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument()
    })
    // the required exact phrase must still be present alongside the detail
    expect(
      screen.getByText(/Unable to connect to TokTickIT API/i),
    ).toBeInTheDocument()
  })

  it('shows the offline error state when categories fail even though health succeeded', async () => {
    const mockFetch = vi.fn((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
        })
      }
      return Promise.reject(new Error('categories down'))
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /check system/i }))

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/Unable to connect to TokTickIT API/i),
    ).toBeInTheDocument()
  })
})

describe('UI-02: category list', () => {
  it('shows a loading state, then the category list, after successful mocked API responses', async () => {
    let resolveHealth: (value: unknown) => void = () => {}
    const healthGate = new Promise((resolve) => {
      resolveHealth = resolve
    })

    const mockFetch = vi.fn((url: string) => {
      if (url.includes('/api/health')) {
        return healthGate.then(() => ({
          ok: true,
          json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
        }))
      }
      return Promise.resolve({
        ok: true,
        json: async () => [
          { id: 1, name: 'Account and Access' },
          { id: 2, name: 'Hardware' },
          { id: 3, name: 'Software' },
          { id: 4, name: 'Network' },
        ],
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /check system/i }))

    expect(
      screen.getByRole('button', { name: /checking/i }),
    ).toBeInTheDocument()

    resolveHealth(undefined)

    await waitFor(() => {
      expect(screen.getByText('Account and Access')).toBeInTheDocument()
    })
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Software')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
  })
})
