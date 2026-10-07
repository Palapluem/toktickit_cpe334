// LOCK-01 · lab-04 BR-33 — the helpers the lock tests rely on (API-17, WF-08, WF-17) must not pass for the wrong reason.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../src/prisma.js'
import { DANIEL_EMAIL, holdTicketLock, removeTickets, ticketFactory, waitUntilBlocked } from './lab4-fixtures.js'

const BAND = 'TKT-2026-96'
const makeTicket = ticketFactory(BAND)

/** Proves, independently of the helper under test, that some backend is waiting on a lock that involves `table`. */
async function expectLockWait(table: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const [row] = await prisma.$queryRaw<{ waiting: bigint }[]>`
      SELECT count(*) AS "waiting" FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE ${`%"${table}"%`}`
    if (Number(row.waiting) > 0) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`The fixture never produced a lock wait on ${table}.`)
}

afterAll(async () => {
  await removeTickets(BAND)
})

describe('LOCK-01 · waitUntilBlocked waits for a request blocked on the Ticket, and for nothing else', () => {
  it('settles once an UPDATE of the Ticket is waiting behind a held lock', async () => {
    const ticketId = await makeTicket({ ownerEmail: DANIEL_EMAIL })
    const lock = holdTicketLock(ticketId)
    await lock.acquired

    // A Prisma raw call only starts when it is awaited or chained, so chain it to start the wait now.
    const waiting = prisma.$executeRaw`UPDATE "Ticket" SET "version" = "version" WHERE "id" = ${ticketId}::uuid`.then((count) => count)
    await waitUntilBlocked()

    lock.release()
    await lock.done
    await waiting
  })

  it('does not take a waiter on another table for one on the Ticket, and says so', async () => {
    const [category] = await prisma.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Category" LIMIT 1`
    let release: () => void = () => {}
    let signal: () => void = () => {}
    const held = new Promise<void>((resolve) => { release = resolve })
    const acquired = new Promise<void>((resolve) => { signal = resolve })
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Category" WHERE "id" = ${category.id}::uuid FOR UPDATE`
        signal()
        await held
      },
      { timeout: 20_000 },
    )
    await acquired
    const waiting = prisma.$executeRaw`UPDATE "Category" SET "name" = "name" WHERE "id" = ${category.id}::uuid`.then((count) => count)
    await expectLockWait('Category')

    try {
      // A lock wait exists, but not on the Ticket: the helper must not call that a blocked request.
      await expect(waitUntilBlocked(600)).rejects.toThrow('No request is waiting for a lock on the Ticket.')
    } finally {
      release()
      await holder
      await waiting
    }
  })
})
