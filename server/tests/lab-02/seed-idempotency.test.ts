/**
 * Seed idempotency — Issue #18.
 *
 * Proves: the Definition of Done item "Seed remains idempotent"
 * (`specification.md` §10) and the seeding rule in §7.
 *
 * Test design technique: TDT-05 error guessing. The failure this guards against
 * is a seed written with `create` rather than `upsert`, which works perfectly on
 * a clean database and duplicates every row on the second run. Nothing else in
 * the suite would notice, because every other test reads the list once.
 *
 * The seed is invoked as a child process rather than imported, so what is tested
 * is the command a person actually runs.
 */
import { execFileSync } from 'node:child_process'
import { describe, expect, it, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { expectDataArray } from './envelope.js'

function runSeed(): void {
  execFileSync('npm', ['run', 'db:seed'], {
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
  })
}

describe('Definition of Done · the seed is idempotent', () => {
  beforeAll(() => {
    // The suite has already seeded once; this is the second and third run.
    runSeed()
    runSeed()
  }, 120_000)

  it('leaves exactly four categories after repeated runs', async () => {
    expect(
      expectDataArray(await request(app).get('/api/categories')),
    ).toHaveLength(4)
  })

  it('leaves exactly seven related systems after repeated runs', async () => {
    expect(
      expectDataArray(await request(app).get('/api/related-systems')),
    ).toHaveLength(7)
  })

  it('leaves exactly four active requesters after repeated runs', async () => {
    expect(
      expectDataArray(await request(app).get('/api/requesters')),
    ).toHaveLength(4)
  })

  it('produces no duplicate names in any reference list', async () => {
    for (const path of ['/api/categories', '/api/related-systems']) {
      const rows = expectDataArray(await request(app).get(path))
      const names = rows.map((row) => (row as { name: string }).name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})
