// UNIT-06. Session lifetime is enforced, not left to the cookie's own expiry —
// a client that keeps sending an expired cookie must still be refused.
import { afterAll, describe, expect, it } from 'vitest'
import prisma from '../../src/prisma.js'
import {
  SESSION_TTL_MS,
  createSessionToken,
  endAllSessions,
  endOtherSessions,
  endSession,
  resolveSession,
  startSession,
} from '../../src/auth/session.js'
import { REQUESTER_EMAIL, STAFF_EMAIL } from './auth-fixtures.js'

async function userId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  })
  return user.id
}

afterAll(async () => {
  await prisma.session.deleteMany()
})

describe('UNIT-06 · session tokens', () => {
  it('is 32 bytes of base64url, long enough not to be guessed', () => {
    const token = createSessionToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => createSessionToken()))
    expect(tokens.size).toBe(50)
  })

  it('is not derived from the user id', async () => {
    const id = await userId(REQUESTER_EMAIL)
    const { token } = await startSession(id)
    expect(token.length).toBeGreaterThan(0)
    expect(token).not.toContain(id)
    expect(token).not.toContain(id.replace(/-/g, ''))
  })
})

describe('UNIT-06 · session resolution (BR-08, SEC-014)', () => {
  it('resolves a live session to its user', async () => {
    const id = await userId(STAFF_EMAIL)
    const { token } = await startSession(id)

    const user = await resolveSession(token)
    expect(user?.id).toBe(id)
    expect(user?.role).toBe('IT_STAFF')
  })

  it('sets the expiry eight hours out', async () => {
    const id = await userId(REQUESTER_EMAIL)
    const before = Date.now()
    const { expiresAt } = await startSession(id)

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + SESSION_TTL_MS - 5_000)
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + SESSION_TTL_MS + 5_000)
  })

  it('refuses a session whose expiry has passed', async () => {
    const id = await userId(REQUESTER_EMAIL)
    const { token } = await startSession(id)
    expect(await resolveSession(token)).not.toBeNull()

    await prisma.session.update({
      where: { id: token },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    })
    expect(await resolveSession(token)).toBeNull()
  })

  it('refuses a token that was never issued', async () => {
    // The positive control: an issued token does resolve.
    const { token } = await startSession(await userId(REQUESTER_EMAIL))
    expect(await resolveSession(token)).not.toBeNull()

    expect(await resolveSession(createSessionToken())).toBeNull()
    expect(await resolveSession('')).toBeNull()
  })

  it('refuses a session whose user has been deactivated (BR-39)', async () => {
    const id = await userId(REQUESTER_EMAIL)
    const { token } = await startSession(id)
    expect(await resolveSession(token)).not.toBeNull()

    await prisma.user.update({ where: { id }, data: { isActive: false } })
    try {
      expect(await resolveSession(token)).toBeNull()
    } finally {
      await prisma.user.update({ where: { id }, data: { isActive: true } })
    }
  })
})

describe('UNIT-06 · ending sessions', () => {
  it('ends one session and leaves the others alone', async () => {
    const id = await userId(REQUESTER_EMAIL)
    const first = await startSession(id)
    const second = await startSession(id)

    await endSession(first.token)
    expect(await resolveSession(first.token)).toBeNull()
    expect(await resolveSession(second.token)).not.toBeNull()
  })

  it('ends every session but the one held (BR-07)', async () => {
    const id = await userId(REQUESTER_EMAIL)
    const kept = await startSession(id)
    const dropped = await startSession(id)

    await endOtherSessions(id, kept.token)
    expect(await resolveSession(kept.token)).not.toBeNull()
    expect(await resolveSession(dropped.token)).toBeNull()
  })

  it('ends every session a user holds (BR-39)', async () => {
    const id = await userId(REQUESTER_EMAIL)
    const first = await startSession(id)
    const second = await startSession(id)

    await endAllSessions(id)
    expect(await resolveSession(first.token)).toBeNull()
    expect(await resolveSession(second.token)).toBeNull()
  })

  it('leaves another user’s sessions untouched', async () => {
    const mine = await startSession(await userId(REQUESTER_EMAIL))
    const theirs = await startSession(await userId(STAFF_EMAIL))

    await endAllSessions(await userId(REQUESTER_EMAIL))
    expect(await resolveSession(mine.token)).toBeNull()
    expect(await resolveSession(theirs.token)).not.toBeNull()
  })
})
