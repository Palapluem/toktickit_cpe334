// Review follow-up for PR #31. Express's error middleware flow must preserve
// the API envelope rather than returning the framework's stack/HTML response.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../../src/app.js'

describe('shared unexpected-error middleware', () => {
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
})
