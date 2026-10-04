// MIG-03 to MIG-05 · lab-04 AC-39, BR-21, BR-27, BR-42 — the seed after the Lab 4 migration.
// The expectations are written from the contract (specification §7, §5.3), not read back from the seed.
import { execFileSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../src/prisma.js'
import { SEED_TICKETS } from '../../src/seed/demoTickets.js'
import { restoreSeededCredentials } from '../lab-03/auth-fixtures.js'
import { clearHistory } from './lab4-fixtures.js'

const runSeed = () =>
  execFileSync('npm', ['run', 'db:seed'], { stdio: 'pipe', shell: process.platform === 'win32', env: { ...process.env } })

// Actions per seeded Ticket, by the last digits of its number (specification §7).
const EXPECTED_PER_TICKET: Record<number, number> = { 1: 0, 2: 0, 3: 1, 4: 3, 5: 0, 6: 2, 7: 1, 8: 0, 9: 0, 10: 1 }
const numberOf = (n: number) => `TKT-2026-${String(900_000 + n).padStart(6, '0')}`

const actions = () =>
  prisma.actionTaken.findMany({ where: { ticket: { ticketNo: { in: SEED_TICKETS.map((t) => t.ticketNo) } } }, include: { ticket: { include: { owner: true } } } })

// Every column of every seeded Action, in a fixed order, so two runs can be compared whole.
const snapshot = async () => (await actions()).sort((a, b) => a.id.localeCompare(b.id)).map(({ ticket: _ticket, ...row }) => row)

let firstRun: Awaited<ReturnType<typeof snapshot>>
let secondRun: Awaited<ReturnType<typeof snapshot>>
let eventsBefore: number

beforeAll(async () => {
  await restoreSeededCredentials()
  eventsBefore = await prisma.ticketEvent.count()
  runSeed()
  firstRun = await snapshot()
  runSeed()
  secondRun = await snapshot()
}, 240_000)

afterAll(async () => {
  await clearHistory()
})

describe('MIG-04 · AC-39 · BR-42 · the seeded Actions', () => {
  it('puts zero, one and several Actions on the Tickets the contract names', async () => {
    const found = await actions()
    expect(found).toHaveLength(8)
    for (const [n, expected] of Object.entries(EXPECTED_PER_TICKET)) {
      const count = found.filter((a) => a.ticket.ticketNo === numberOf(Number(n))).length
      expect(count, numberOf(Number(n))).toBe(expected)
    }
    const perTicket = Object.values(EXPECTED_PER_TICKET)
    expect(perTicket.filter((c) => c === 0).length).toBe(5)
    expect(perTicket.filter((c) => c === 1).length).toBe(3)
    expect(perTicket.filter((c) => c > 1).length).toBe(2)
  })

  it('changes nothing on a second run: same identifiers, no duplicates, every column as it was (BR-42)', () => {
    expect(firstRun).toHaveLength(8)
    expect(new Set(secondRun.map((a) => a.id)).size).toBe(secondRun.length)
    expect(secondRun).toEqual(firstRun)
  })

  it('shows every Action status and keeps owner, performer and assignee distinct (BR-02)', async () => {
    const found = await actions()
    expect(new Set(found.map((a) => a.status))).toEqual(new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']))
    expect(found.some((a) => a.assigneeId !== a.performedById)).toBe(true)
    expect(found.some((a) => a.ticket.ownerId !== null && a.assigneeId !== a.ticket.ownerId)).toBe(true)
    expect(found.some((a) => a.ticket.owner?.role === 'ADMINISTRATOR' && a.assigneeId !== a.ticket.ownerId)).toBe(true)
  })

  it('records a Result, a reason and the completer or canceller wherever the lifecycle requires them (BR-11, BR-12, BR-14)', async () => {
    const found = await actions()
    expect(found.length, 'there are seeded Actions to check').toBe(8)
    for (const a of found) {
      if (a.status === 'COMPLETED') {
        expect(a.result?.trim(), a.id).toBeTruthy()
        expect(a.completedById, a.id).not.toBeNull()
        expect(a.completedAt, a.id).not.toBeNull()
      }
      if (a.status === 'CANCELLED') {
        expect(a.cancellationReason?.trim(), a.id).toBeTruthy()
        expect(a.cancelledById, a.id).not.toBeNull()
        expect(a.cancelledAt, a.id).not.toBeNull()
      }
      if (a.followUpRequired) expect(a.followUpNote?.trim(), a.id).toBeTruthy()
      if (a.status === 'PLANNED' || a.status === 'IN_PROGRESS') expect(a.completedById ?? a.cancelledById).toBeNull()
    }
  })

  it('leaves no open Action on a Resolved, Closed or Cancelled Ticket (BR-20)', async () => {
    const found = await actions()
    expect(found.some((a) => ['RESOLVED', 'CLOSED'].includes(a.ticket.status)), 'a finished Ticket carries Actions').toBe(true)
    for (const a of found) {
      if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(a.ticket.status)) {
        expect(['COMPLETED', 'CANCELLED'], `${a.ticket.ticketNo} ${a.status}`).toContain(a.status)
      }
    }
  })

  it('gives the dashboard its seed values: two open Actions for Patricia Evans, none for Margaret Hale (MET-S06)', async () => {
    const open = (email: string) =>
      prisma.actionTaken.count({ where: { assignee: { email }, status: { in: ['PLANNED', 'IN_PROGRESS'] } } })
    expect(await open('patricia.evans@example.ac.th')).toBe(2)
    expect(await open('margaret.hale@example.ac.th')).toBe(0)
  })

  it('writes no history: it starts with the first change made through the application (BR-26)', async () => {
    expect(await prisma.ticketEvent.count()).toBe(eventsBefore)
  })
})

describe('MIG-03 · AC-38 · BR-21 · Tickets with no Actions are left as they were', () => {
  it('keeps the seeded status and starts at version 1', async () => {
    const legacy = SEED_TICKETS.filter((t) => EXPECTED_PER_TICKET[Number(t.ticketNo.slice(-6)) - 900_000] === 0)
    expect(legacy).toHaveLength(5)
    for (const seeded of legacy) {
      const stored = await prisma.ticket.findUniqueOrThrow({ where: { ticketNo: seeded.ticketNo } })
      expect(stored.status, seeded.ticketNo).toBe(seeded.status)
      expect(stored.version, seeded.ticketNo).toBe(1)
      expect(await prisma.actionTaken.count({ where: { ticketId: stored.id } }), seeded.ticketNo).toBe(0)
    }
  })
})

describe('MIG-05 · BR-27 · the database itself refuses to change or delete history', () => {
  it('rejects UPDATE and DELETE on an event, leaves the row alone, and still allows a reset by TRUNCATE', async () => {
    const ticket = await prisma.ticket.findFirstOrThrow({ select: { id: true } })
    const actor = await prisma.user.findFirstOrThrow({ where: { role: 'IT_STAFF' }, select: { id: true } })
    const event = await prisma.ticketEvent.create({
      data: { ticketId: ticket.id, actorId: actor.id, type: 'STATUS_CHANGED', payload: { from: 'NEW', to: 'OPEN' } },
    })

    await expect(prisma.$executeRaw`UPDATE "TicketEvent" SET "payload" = '{}'::jsonb WHERE "id" = ${event.id}::uuid`).rejects.toThrow(/append-only/i)
    await expect(prisma.$executeRaw`DELETE FROM "TicketEvent" WHERE "id" = ${event.id}::uuid`).rejects.toThrow(/append-only/i)
    expect(await prisma.ticketEvent.findUniqueOrThrow({ where: { id: event.id } })).toMatchObject({ payload: { from: 'NEW', to: 'OPEN' } })

    await clearHistory()
    expect(await prisma.ticketEvent.count()).toBe(0)
  })
})
