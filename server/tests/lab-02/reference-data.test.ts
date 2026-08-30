/**
 * Reference-data endpoints — Issue #18.
 *
 * Proves: FR-01, FR-08, FR-09, BR-10, BR-22, and the ordering rule in
 * `specification.md` §11.15.
 *
 * Test design techniques (`testing-contract.md` §2):
 *   TDT-01 equivalence partitioning — active versus inactive rows are the two
 *          classes that behave differently; one representative of each suffices.
 *   TDT-05 error guessing — the inactive Requester is seeded precisely because
 *          a list of only active rows cannot prove it is being filtered out.
 *
 * Every test reads its rows through `expectDataArray`, which asserts the status
 * and the envelope first. Without it a missing or wrongly-shaped endpoint fails
 * with `undefined.map` — a TypeError describing the test's own shape rather than
 * the absent behaviour, which `testing-contract.md` §5 rejects as red-phase
 * evidence.
 *
 * These assert names and ordering, never identifiers. Identifiers are UUID and
 * regenerate on every migration (`specification.md` §11.1).
 */
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { expectDataArray } from './envelope.js'

const CATEGORY_NAMES = ['Account and Access', 'Hardware', 'Network', 'Software']

const RELATED_SYSTEM_NAMES = [
  'Campus Wi-Fi',
  'Corporate Laptop',
  'Email',
  'Grade Submission App',
  'LEB2 App',
  'Printer',
  'VPN',
]

const ACTIVE_REQUESTER_NAMES = [
  'David Lee',
  'Jennifer Anderson',
  'Michael Brown',
  'Sarah Johnson',
]

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('FR-08 · GET /api/categories', () => {
  it('returns the seeded categories inside the data envelope, ordered by name', async () => {
    const categories = expectDataArray(await request(app).get('/api/categories'))

    expect(categories.map((c) => (c as { name: string }).name)).toEqual(
      CATEGORY_NAMES,
    )
  })

  it('identifies each category by UUID rather than by an integer (§11.1)', async () => {
    const categories = expectDataArray(await request(app).get('/api/categories'))

    for (const category of categories) {
      expect((category as { id: string }).id).toMatch(UUID_PATTERN)
    }
  })

  it('exposes only id and name, so no internal column leaks into the client', async () => {
    const categories = expectDataArray(await request(app).get('/api/categories'))

    for (const category of categories) {
      expect(Object.keys(category as object).sort()).toEqual(['id', 'name'])
    }
  })
})

describe('FR-09 · GET /api/related-systems', () => {
  it('returns the seven seeded related systems inside the data envelope, ordered by name', async () => {
    const systems = expectDataArray(
      await request(app).get('/api/related-systems'),
    )

    expect(systems.map((s) => (s as { name: string }).name)).toEqual(
      RELATED_SYSTEM_NAMES,
    )
  })

  it('exposes only id and name', async () => {
    const systems = expectDataArray(
      await request(app).get('/api/related-systems'),
    )

    for (const system of systems) {
      expect(Object.keys(system as object).sort()).toEqual(['id', 'name'])
    }
  })
})

describe('FR-01 · GET /api/requesters', () => {
  it('returns the active development requesters, ordered by display name', async () => {
    const requesters = expectDataArray(await request(app).get('/api/requesters'))

    expect(
      requesters.map((r) => (r as { displayName: string }).displayName),
    ).toEqual(ACTIVE_REQUESTER_NAMES)
  })

  /**
   * BR-10 is the reason the seed carries an inactive row at all. Asserting only
   * that four names come back would pass against an endpoint with no filter
   * whatsoever, so this names the row that must be absent.
   */
  it('BR-10 · never returns the inactive requester', async () => {
    const requesters = expectDataArray(await request(app).get('/api/requesters'))

    const names = requesters.map(
      (r) => (r as { displayName: string }).displayName,
    )
    expect(names).not.toContain('Robert Wilson')
  })

  it('exposes id, displayName, and email, and never an isActive flag', async () => {
    const requesters = expectDataArray(await request(app).get('/api/requesters'))

    for (const requester of requesters) {
      expect(Object.keys(requester as object).sort()).toEqual([
        'displayName',
        'email',
        'id',
      ])
    }
  })
})
