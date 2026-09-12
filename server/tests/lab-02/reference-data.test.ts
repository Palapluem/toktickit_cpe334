// Reference-data endpoints (#18). FR-01, FR-08, FR-09, BR-10, BR-22, §11.15.
// TDT-01 active/inactive partition; TDT-05 unfiltered-list failure; names/order only.
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { expectDataArray } from './envelope.js'
// Reference data now requires authentication (api-spec.md §5). What these tests
// assert is unchanged; only the way they reach the endpoint is.
import { REQUESTER_EMAIL, signIn } from '../lab-03/auth-fixtures.js'

let cookie: string

beforeAll(async () => {
  cookie = await signIn(REQUESTER_EMAIL)
})

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
    const categories = expectDataArray(await request(app).get('/api/categories').set('Cookie', cookie))

    expect(categories.map((c) => (c as { name: string }).name)).toEqual(
      CATEGORY_NAMES,
    )
  })

  it('identifies each category by UUID rather than by an integer (§11.1)', async () => {
    const categories = expectDataArray(await request(app).get('/api/categories').set('Cookie', cookie))

    for (const category of categories) {
      expect((category as { id: string }).id).toMatch(UUID_PATTERN)
    }
  })

  it('exposes only id and name, so no internal column leaks into the client', async () => {
    const categories = expectDataArray(await request(app).get('/api/categories').set('Cookie', cookie))

    for (const category of categories) {
      expect(Object.keys(category as object).sort()).toEqual(['id', 'name'])
    }
  })
})

describe('FR-09 · GET /api/related-systems', () => {
  it('returns the seven seeded related systems inside the data envelope, ordered by name', async () => {
    const systems = expectDataArray(
      await request(app).get('/api/related-systems').set('Cookie', cookie),
    )

    expect(systems.map((s) => (s as { name: string }).name)).toEqual(
      RELATED_SYSTEM_NAMES,
    )
  })

  it('exposes only id and name', async () => {
    const systems = expectDataArray(
      await request(app).get('/api/related-systems').set('Cookie', cookie),
    )

    for (const system of systems) {
      expect(Object.keys(system as object).sort()).toEqual(['id', 'name'])
    }
  })
})

describe('FR-01 · the development requester selector is gone (AC-15)', () => {
  it('no longer answers, so no second identity path exists', async () => {
    // The positive control: an endpoint that does still exist answers.
    expect(
      (await request(app).get('/api/categories').set('Cookie', cookie)).status,
    ).toBe(200)

    expect((await request(app).get('/api/requesters').set('Cookie', cookie)).status).toBe(404)
  })
})

describe('AC-12 · reference data is behind the session', () => {
  it('refuses an unauthenticated caller', async () => {
    for (const path of ['/api/categories', '/api/related-systems']) {
      const response = await request(app).get(path)
      expect(response.status, path).toBe(401)
    }
  })
})
