import { expect } from 'vitest'
import type { Response } from 'supertest'

/**
 * Assert that a response carries the `{ "data": [...] }` envelope every endpoint
 * returns (`api-spec.md` §1), and hand back the rows.
 *
 * This exists so that a missing or wrongly-shaped endpoint fails with an
 * assertion describing what was absent, rather than a TypeError on
 * `undefined.map`. `testing-contract.md` §5 rejects the latter as red-phase
 * evidence: it proves the test could not run, not that the behaviour is missing.
 *
 * Shared per TCS-07 — the setup is common to every reference-data test, while
 * the assertions that follow are each test's own.
 */
export function expectDataArray(response: Response): unknown[] {
  expect(response.status).toBe(200)
  expect(response.body).toHaveProperty('data')
  expect(Array.isArray(response.body.data)).toBe(true)
  return response.body.data
}
