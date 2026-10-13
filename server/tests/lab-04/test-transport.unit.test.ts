// TC-025: test-created HTTP servers bind to loopback and requests are answered by the app under test.
import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'

describe('TC-025 · test-harness transport isolation', () => {
  it('TC-025 binds the throwaway server to 127.0.0.1 only', async () => {
    let boundTo = ''
    const app = (req: IncomingMessage, res: ServerResponse) => {
      boundTo = req.socket.localAddress ?? ''
      res.end('ok')
    }

    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(boundTo).toBe('127.0.0.1')
  })

  it('TC-025 routes each of 400 requests to the app instance that was called', async () => {
    const wrong: string[] = []
    for (let i = 0; i < 400; i++) {
      const nonce = `n-${i}-${Math.random().toString(36).slice(2)}`
      const app = (_req: IncomingMessage, res: ServerResponse) => res.end(nonce)
      const response = await request(app).get('/')
      if (response.text !== nonce) wrong.push(`${i}: ${response.status} ${response.text.slice(0, 40)}`)
    }

    expect(wrong).toEqual([])
  })
})
