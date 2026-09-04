// Reference-data endpoints (#18). FR-01, FR-08, FR-09, BR-10, BR-22, §11.15.
// TDT-01 active/inactive partition; TDT-05 unfiltered-list failure; names/order only.
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

  // Naming the absent row: asserting four names would pass with no filter at all.
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
