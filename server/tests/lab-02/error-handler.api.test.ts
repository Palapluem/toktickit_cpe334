// Error middleware follow-up for PR #31. TC-008, BR-14; preserve the JSON envelope.
import request from 'supertest'
import express from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.js'
import { errorHandler } from '../../src/http/errors.js'
import { TicketCreationError } from '../../src/tickets/createTicket.js'

describe('shared unexpected-error middleware', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps malformed JSON to a safe JSON error envelope', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":')

    expect(response.status).toBe(400)
    expect(response.headers['content-type']).toMatch(/json/)
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request body must be valid JSON.',
        fieldErrors: [],
        correlationId: expect.any(String),
      },
    })

    const body = JSON.stringify(response.body)
    expect(body).not.toMatch(/SyntaxError|Unexpected end|at .*:\d+/i)
  })

  it('maps an async exception to a safe internal-error envelope', async () => {
    const probe = express()
    probe.get('/unexpected', async (_req, _res) => {
      throw new Error('SELECT password FROM secrets at server/src/db.ts:42')
    })
    probe.use(errorHandler)

    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await request(probe).get('/unexpected')

    expect(response.status).toBe(500)
    expect(response.headers['content-type']).toMatch(/json/)
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected server error occurred. Please try again.',
        fieldErrors: [],
        correlationId: expect.any(String),
      },
    })

    const body = JSON.stringify(response.body)
    expect(body).not.toMatch(/SELECT password|server\/src\/db\.ts|at .*:\d+/i)
  })

  it('maps a known API error through the shared middleware', async () => {
    const probe = express()
    probe.get('/contract', (_req, _res, next) => {
      next(
        new TicketCreationError(
          400,
          'VALIDATION_FAILED',
          'One or more fields are invalid.',
          [{ field: 'summary', message: 'Summary is required.' }],
        ),
      )
    })
    probe.use(errorHandler)

    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await request(probe).get('/contract')

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'One or more fields are invalid.',
        fieldErrors: [{ field: 'summary', message: 'Summary is required.' }],
        correlationId: expect.any(String),
      },
    })
  })
})
