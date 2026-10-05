// Shared setup for the Lab 4 API tests: people, throwaway Tickets, and the cleanup the append-only history needs.
import prisma from '../../src/prisma.js'
import type { TicketStatus } from '../../src/tickets/transitions.js'
import { REQUESTER_EMAIL } from '../lab-03/auth-fixtures.js'

export {
  ADMIN_EMAIL,
  INACTIVE_STAFF_EMAIL,
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  restoreSeededCredentials,
  signIn,
} from '../lab-03/auth-fixtures.js'

export const DANIEL_EMAIL = 'daniel.carter@example.ac.th'
export const OLIVIA_EMAIL = 'olivia.reed@example.ac.th'

export const WORKABLE: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']
export const NOT_WORKABLE: TicketStatus[] = ['RESOLVED', 'CLOSED', 'CANCELLED']

export async function idFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } })
  return user.id
}

/** One throwaway Ticket per call, numbered inside the band its file owns. */
export function ticketFactory(band: string) {
  let counter = 0
  return async function makeTicket(
    options: { status?: TicketStatus; ownerEmail?: string | null; requesterEmail?: string } = {},
  ): Promise<string> {
    const { status = 'IN_PROGRESS', ownerEmail = null, requesterEmail = REQUESTER_EMAIL } = options
    const [category, relatedSystem, requesterId, ownerId] = await Promise.all([
      prisma.category.findFirstOrThrow({ select: { id: true } }),
      prisma.relatedSystem.findFirstOrThrow({ select: { id: true } }),
      idFor(requesterEmail),
      ownerEmail === null ? Promise.resolve(null) : idFor(ownerEmail),
    ])
    counter += 1
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `${band}${String(counter).padStart(4, '0')}`,
        requesterId,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: 'Lab 4 fixture',
        description: 'Created by a Lab 4 API test.',
        requestedPriority: 'MEDIUM',
        itPriority: 'MEDIUM',
        status,
        ownerId,
      },
      select: { id: true },
    })
    return ticket.id
  }
}

/** TRUNCATE is the one way to empty the history, because the trigger refuses DELETE (lab-04 BR-27). */
export async function clearHistory(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE "TicketEvent"')
}

export async function removeTickets(band: string): Promise<void> {
  const tickets = await prisma.ticket.findMany({
    where: { ticketNo: { startsWith: band } },
    select: { id: true },
  })
  const ids = tickets.map((ticket) => ticket.id)
  await clearHistory()
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ids } } })
  await prisma.publicComment.deleteMany({ where: { ticketId: { in: ids } } })
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } })
}

/**
 * Holds a Ticket's row lock until released; `acquired` settles once the lock is really held, not after a guess.
 * `whileHeld` runs inside the holder's transaction, so its change is committed only when the lock is released.
 */
export function holdTicketLock(ticketId: string, whileHeld?: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<unknown>) {
  let release: () => void = () => {}
  let signal: () => void = () => {}
  const held = new Promise<void>((resolve) => { release = resolve })
  const acquired = new Promise<void>((resolve) => { signal = resolve })
  const done = prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticketId}::uuid FOR UPDATE`
      await whileHeld?.(tx)
      signal()
      await held
    },
    { timeout: 20_000 },
  )
  return { acquired, release, done }
}

/** Settles once a backend of this database is waiting for a lock, so a request is known to be blocked, not just slow. */
export async function waitUntilBlocked(timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const [row] = await prisma.$queryRaw<{ waiting: bigint }[]>`
      SELECT count(*) AS "waiting" FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`
    if (Number(row.waiting) > 0) return
    if (Date.now() > deadline) throw new Error('No request is waiting for a lock.')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
