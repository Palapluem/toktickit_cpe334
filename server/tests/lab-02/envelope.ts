import { expect } from 'vitest'
import type { Response } from 'supertest'

// Asserts the { data: [...] } envelope (api-spec.md §1) before returning rows, so
// a missing endpoint fails on an assertion rather than undefined.map.
export function expectDataArray(response: Response): unknown[] {
  expect(response.status).toBe(200)
  expect(response.body).toHaveProperty('data')
  expect(Array.isArray(response.body.data)).toBe(true)
  return response.body.data
}
