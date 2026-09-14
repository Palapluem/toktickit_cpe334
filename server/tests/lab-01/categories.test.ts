// Lab 1 regression. Rewritten in #18: the original asserted a bare array and
// literal ids 1–4, both changed by the UUID migration (§11.1). Asserts names and
// order, which survive it. Envelope and UUID shape: tests/lab-02/reference-data.
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { expectDataArray } from '../lab-02/envelope.js'
import { REQUESTER_EMAIL, signIn } from '../lab-03/auth-fixtures.js'

let cookie: string

beforeAll(async () => {
  cookie = await signIn(REQUESTER_EMAIL)
})

describe('API-02: GET /api/categories', () => {
  it('still returns the four seeded categories from PostgreSQL via Prisma', async () => {
    const categories = expectDataArray(await request(app).get('/api/categories').set('Cookie', cookie))

    expect(categories.map((c) => (c as { name: string }).name)).toEqual([
      'Account and Access',
      'Hardware',
      'Network',
      'Software',
    ])
  })
})
