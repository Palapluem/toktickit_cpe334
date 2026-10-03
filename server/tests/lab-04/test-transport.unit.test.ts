// #96 · TCS-03/TCS-05: a request must reach the app under test, not a local service that shares its port.
import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'

describe('#96 · throwaway test servers listen on loopback only', () => {
  it('binds the server supertest creates to 127.0.0.1, not to every interface', async () => {
    let boundTo = ''
    const app = (req: IncomingMessage, res: ServerResponse) => {
      boundTo = req.socket.localAddress ?? ''
      res.end('ok')
    }

    const response = await request(app).get('/')

    expect(response.status).toBe(200)
    expect(boundTo).toBe('127.0.0.1')
  })

  it('answers each of 400 requests from the app that was called', async () => {
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
