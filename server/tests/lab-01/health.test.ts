import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'

describe('API-01: GET /api/health', () => {
  it('returns 200 with the expected status payload', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', service: 'TokTickIT API' })
  })
})
