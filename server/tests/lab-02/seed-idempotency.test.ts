// Seed idempotency (#18). Definition of Done, §7.
// TDT-05: guards a seed written with create instead of upsert, which works on a
// clean database and duplicates everything on the second run.
// Invoked as a child process, so what is tested is the command people run.
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
    // The suite seeded once already; these are runs two and three.
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
