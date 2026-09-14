// MIG-01, MIG-02, MIG-03 and the seed's database-level properties.
// These are boundary tests, not red-green cycles (tests.md §1): they assert
// what must remain true of the migrated database, so they pass once it is right.
import { execFileSync } from 'node:child_process'
import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import prisma from '../../src/prisma.js'
import app from '../../src/app.js'
import { verifyPassword } from '../../src/auth/password.js'
import {
  DEVELOPMENT_PASSWORD,
  LAB2_REQUESTER_EMAILS,
} from '../../src/seed/roster.js'
import { SEED_TICKETS } from '../../src/seed/demoTickets.js'

function runSeed(): void {
  execFileSync('npm', ['run', 'db:seed'], {
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
  })
}

type Counts = {
  users: number
  tickets: number
  attachments: number
  comments: number
  notes: number
}

async function counts(): Promise<Counts> {
  const [users, tickets, attachments, comments, notes] = await Promise.all([
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.attachment.count(),
    prisma.publicComment.count(),
    prisma.internalNote.count(),
  ])
  return { users, tickets, attachments, comments, notes }
}

let afterFirstRun: Counts
let afterSecondRun: Counts

describe('L3-2 · the migrated database', () => {
  beforeAll(async () => {
    // Earlier Lab 2 files clear Ticket data, so this restores the demo rows
    // and measures idempotency at the same time.
    runSeed()
    afterFirstRun = await counts()
    runSeed()
    afterSecondRun = await counts()
  }, 180_000)

  describe('MIG-01 · Lab 2 identifiers survive (BR-40)', () => {
    it('resolves every Lab 2 requester to a User holding the Requester role', async () => {
      for (const email of LAB2_REQUESTER_EMAILS) {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true },
        })
        expect(user, `${email} did not survive the migration`).not.toBeNull()
        expect(user?.role).toBe('REQUESTER')
      }
    })
  })

  describe('MIG-02 · Ticket and Attachment data survive (BR-42)', () => {
    // Prisma types a required relation as non-null, so reading through the
    // client cannot detect an orphan. These scan the columns directly.
    it('leaves no row pointing at a user that is not there', async () => {
      const orphans = await prisma.$queryRaw<{ source: string; n: bigint }[]>`
        SELECT 'ticket.requesterId' AS source, COUNT(*) AS n
          FROM "Ticket" t LEFT JOIN "User" u ON u."id" = t."requesterId"
         WHERE u."id" IS NULL
        UNION ALL
        SELECT 'ticket.ownerId', COUNT(*)
          FROM "Ticket" t LEFT JOIN "User" u ON u."id" = t."ownerId"
         WHERE t."ownerId" IS NOT NULL AND u."id" IS NULL
        UNION ALL
        SELECT 'attachment.uploadedById', COUNT(*)
          FROM "Attachment" a LEFT JOIN "User" u ON u."id" = a."uploadedById"
         WHERE u."id" IS NULL
        UNION ALL
        SELECT 'attachment.removedById', COUNT(*)
          FROM "Attachment" a LEFT JOIN "User" u ON u."id" = a."removedById"
         WHERE a."removedById" IS NOT NULL AND u."id" IS NULL
      `
      expect(orphans).toHaveLength(4)
      for (const row of orphans) {
        expect(Number(row.n), `${row.source} has orphaned rows`).toBe(0)
      }
    })

    it('keeps the foreign keys that make an orphan impossible', async () => {
      const found = await prisma.$queryRaw<{ conname: string }[]>`
        SELECT conname FROM pg_constraint
         WHERE contype = 'f'
           AND conname IN (
             'Ticket_requesterId_fkey',
             'Ticket_ownerId_fkey',
             'Attachment_uploadedById_fkey',
             'Attachment_removedById_fkey'
           )
      `
      expect(found.map((row) => row.conname).sort()).toEqual([
        'Attachment_removedById_fkey',
        'Attachment_uploadedById_fkey',
        'Ticket_ownerId_fkey',
        'Ticket_requesterId_fkey',
      ])
    })

    it('keeps every Ticket Owner an active IT Staff or Administrator (BR-16)', async () => {
      const owned = await prisma.ticket.findMany({
        where: { ownerId: { not: null } },
        select: { owner: { select: { role: true, isActive: true } } },
      })
      expect(owned.length).toBeGreaterThan(0)
      for (const ticket of owned) {
        expect(ticket.owner?.isActive).toBe(true)
        expect(['IT_STAFF', 'ADMINISTRATOR']).toContain(ticket.owner?.role)
      }
    })
  })

  describe('MIG-03 · every account must change its password (BR-41, SEC-011)', () => {
    it('sets mustChangePassword on every user', async () => {
      const total = await prisma.user.count()
      expect(total).toBeGreaterThan(0)
      expect(await prisma.user.count({ where: { mustChangePassword: true } })).toBe(total)
    })
  })

  describe('SEED-06 · no plaintext password is reachable (SEC-006)', () => {
    it('stores a bcrypt hash rather than the password itself', async () => {
      const users = await prisma.user.findMany({
        select: { email: true, passwordHash: true },
      })
      expect(users.length).toBeGreaterThan(0)
      for (const user of users) {
        expect(user.passwordHash).not.toBe(DEVELOPMENT_PASSWORD)
        expect(user.passwordHash).toMatch(/^\$2[aby]\$/)
      }
    })

    it('stores a hash that verifies, so the column holds the real credential', async () => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: LAB2_REQUESTER_EMAILS[0] },
        select: { passwordHash: true },
      })
      expect(await verifyPassword(DEVELOPMENT_PASSWORD, user.passwordHash)).toBe(true)
      expect(await verifyPassword('not-the-password', user.passwordHash)).toBe(false)
    })

    it('never returns a hash from the reference-data endpoint', async () => {
      const response = await request(app).get('/api/requesters')
      expect(response.status).toBe(200)
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|\$2[aby]\$/)
    })
  })

  describe('SEED-07 · the seed is idempotent', () => {
    it('changes no row count on a repeated run', () => {
      expect(afterSecondRun).toEqual(afterFirstRun)
    })

    it('seeds the roster composition the specification states', async () => {
      const byRole = async (role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR', isActive: boolean) =>
        prisma.user.count({ where: { role, isActive } })

      expect(await byRole('REQUESTER', true)).toBe(4)
      expect(await byRole('REQUESTER', false)).toBe(1)
      expect(await byRole('IT_STAFF', true)).toBe(3)
      expect(await byRole('IT_STAFF', false)).toBe(1)
      expect(await byRole('ADMINISTRATOR', true)).toBe(1)
    })

    it('gives the queue a Ticket in every status (BR-20)', async () => {
      const grouped = await prisma.ticket.groupBy({ by: ['status'] })
      const present = new Set(grouped.map((row) => row.status))
      for (const ticket of SEED_TICKETS) {
        expect(present).toContain(ticket.status)
      }
    })

    it('leaves the Ticket Number sequence untouched, so the reserved band holds', async () => {
      const runtime = await prisma.ticket.count({
        where: { ticketNo: { notIn: SEED_TICKETS.map((t) => t.ticketNo) } },
      })
      const sequence = await prisma.ticketNumberSequence.findFirst({
        select: { lastValue: true },
      })
      expect(sequence?.lastValue ?? 0).toBeLessThan(900_000)
      expect(runtime).toBeGreaterThanOrEqual(0)
    })
  })
})
