// UNIT-01. Hashing is salted and slow; verification never compares plaintext.
import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../../src/auth/password.js'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../../src/auth/policy.js'

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

describe('UNIT-02 · password policy (BR-05, SEC-010)', () => {
  const messages = (errors: { field: string; message: string }[]) =>
    errors.map((error) => error.field)

  it('accepts a password at the minimum length', () => {
    expect(validateNewPassword('a'.repeat(MIN_PASSWORD_LENGTH))).toEqual([])
  })

  it('accepts one above the minimum', () => {
    expect(validateNewPassword('a'.repeat(MIN_PASSWORD_LENGTH + 20))).toEqual([])
  })

  it('refuses one character below the minimum', () => {
    const errors = validateNewPassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))
    expect(messages(errors)).toContain('newPassword')
  })

  it('refuses an empty password', () => {
    expect(messages(validateNewPassword(''))).toContain('newPassword')
  })

  it('refuses a value that is not a string', () => {
    expect(messages(validateNewPassword(undefined))).toContain('newPassword')
    expect(messages(validateNewPassword(12345678901))).toContain('newPassword')
  })

  it('refuses a new password identical to the current one', () => {
    const same = 'a'.repeat(MIN_PASSWORD_LENGTH)
    expect(validateNewPassword(same)).toEqual([])
    expect(messages(validateNewPassword(same, same))).toContain('newPassword')
  })

  it('imposes no composition rule the specification does not state', () => {
    // The positive control: the length rule is the one rule, and it does fire.
    expect(messages(validateNewPassword('aaa'))).toContain('newPassword')

    expect(validateNewPassword('aaaaaaaaaaaa')).toEqual([])
    expect(validateNewPassword('            ')).toEqual([])
  })
})
