// UNIT-01. Hashing is salted and slow; verification never compares plaintext.
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../../src/auth/password.js'

const PASSWORD = 'correct-horse-battery-staple'

describe('UNIT-01 · password hashing (BR-04, SEC-006, SEC-007)', () => {
  it('never returns the plaintext', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(hash.length).toBeGreaterThan(0)
    expect(hash).not.toBe(PASSWORD)
    expect(hash).not.toContain(PASSWORD)
  })

  it('produces a different hash each time, so the salt is per-password', async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ])
    expect(first.length).toBeGreaterThan(0)
    expect(first).not.toBe(second)
  })

  it('verifies the password that produced the hash', async () => {
    expect(await verifyPassword(PASSWORD, await hashPassword(PASSWORD))).toBe(true)
  })

  it('refuses a wrong password against a real hash', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(await verifyPassword(PASSWORD, hash)).toBe(true)
    expect(await verifyPassword(`${PASSWORD}x`, hash)).toBe(false)
  })

  it('refuses a malformed hash instead of throwing', async () => {
    // The positive first: a false from a stub would otherwise pass this vacuously.
    expect(await verifyPassword(PASSWORD, await hashPassword(PASSWORD))).toBe(true)
    expect(await verifyPassword(PASSWORD, 'not-a-hash')).toBe(false)
  })
})
