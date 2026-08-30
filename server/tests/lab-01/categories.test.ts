// Lab 1 regression. Rewritten in #18: the original asserted a bare array and
// literal ids 1–4, both changed by the UUID migration (§11.1). Asserts names and
// order, which survive it. Envelope and UUID shape: tests/lab-02/reference-data.
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { expectDataArray } from '../lab-02/envelope.js'

describe('API-02: GET /api/categories', () => {
  it('still returns the four seeded categories from PostgreSQL via Prisma', async () => {
    const categories = expectDataArray(await request(app).get('/api/categories'))

    expect(categories.map((c) => (c as { name: string }).name)).toEqual([
      'Account and Access',
      'Hardware',
      'Network',
      'Software',
    ])
  })
})
