/**
 * Lab 1 regression — GET /api/categories still serves the Create Ticket form.
 *
 * Rewritten in Issue #18. The original asserted a bare array with literal
 * identifiers 1–4. Lab 2 migrates Category to UUID (`specification.md` §11.1)
 * and adopts the `{ data: [...] }` envelope for every endpoint, so both halves
 * of that assertion had to change.
 *
 * It is rewritten rather than deleted: this endpoint is Lab 1's deliverable and
 * the point of a regression test is to notice when a migration breaks it. The
 * assertions now name the categories and their order, which survive a change of
 * identifier type — assertions on identifiers would not.
 *
 * Behaviour specific to the Lab 2 contract — the envelope shape, UUID format,
 * field exposure, and ordering rule — is covered in
 * `tests/lab-02/reference-data.test.ts`.
 */
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
