// Reference data, users, and demo Tickets. Upsert throughout, keyed on a natural
// identifier, so repeated runs converge rather than duplicate — the property
// tests/lab-03/seed-database.api.test.ts asserts.
//
// Credentials are written on create only. A re-seed must not reset a password
// someone has already changed (BR-06).
import prisma from '../src/prisma.js'
import { hashPassword } from '../src/auth/password.js'
import { DEVELOPMENT_PASSWORD, SEED_USERS } from '../src/seed/roster.js'
import { SEED_TICKETS } from '../src/seed/demoTickets.js'

const CATEGORY_NAMES = [
  'Account and Access',
  'Hardware',
  'Network',
  'Software',
]

const RELATED_SYSTEM_NAMES = [
  'Campus Wi-Fi',
  'Corporate Laptop',
  'Email',
  'Grade Submission App',
  'LEB2 App',
  'Printer',
  'VPN',
]

// Fixed instants, so a re-run writes the same timestamps and the queue's
// default ordering is the same on every machine.
const SEED_EPOCH = Date.parse('2026-09-01T02:00:00.000Z')
const HOUR = 3_600_000

const at = (hours: number): Date => new Date(SEED_EPOCH + hours * HOUR)

async function seedReferenceData(): Promise<void> {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } })
  }

  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
}

async function seedUsers(): Promise<Map<string, string>> {
  const passwordHash = await hashPassword(DEVELOPMENT_PASSWORD)
  const byEmail = new Map<string, string>()

  for (const user of SEED_USERS) {
    const row = await prisma.user.upsert({
      where: { email: user.email },
      // Restated so a row edited by hand during testing returns to spec —
      // but never the credential fields.
      update: {
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
      },
      create: {
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        passwordHash,
        mustChangePassword: true,
      },
      select: { id: true },
    })
    byEmail.set(user.email, row.id)
  }

  return byEmail
}

async function seedTickets(userIds: Map<string, string>): Promise<void> {
  const [categories, relatedSystems] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.relatedSystem.findMany({ select: { id: true, name: true } }),
  ])
  const categoryIds = new Map(categories.map((c) => [c.name, c.id]))
  const relatedSystemIds = new Map(relatedSystems.map((s) => [s.name, s.id]))

  const require = <T>(map: Map<string, T>, key: string, kind: string): T => {
    const value = map.get(key)
    if (value === undefined) {
      throw new Error(`Seed references a ${kind} that does not exist: ${key}`)
    }
    return value
  }

  for (const [index, ticket] of SEED_TICKETS.entries()) {
    const createdAt = at(index * 5)
    const ownerId =
      ticket.ownerEmail === null
        ? null
        : require(userIds, ticket.ownerEmail, 'user')
    const requesterResolvedAt = ticket.requesterResolved ? at(index * 5 + 48) : null

    const stored = await prisma.ticket.upsert({
      where: { ticketNo: ticket.ticketNo },
      update: {
        status: ticket.status,
        itPriority: ticket.itPriority,
        ownerId,
        requesterResolvedAt,
      },
      create: {
        ticketNo: ticket.ticketNo,
        requesterId: require(userIds, ticket.requesterEmail, 'user'),
        categoryId: require(categoryIds, ticket.categoryName, 'category'),
        relatedSystemId: require(
          relatedSystemIds,
          ticket.relatedSystemName,
          'related system',
        ),
        summary: ticket.summary,
        description: ticket.description,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        status: ticket.status,
        ownerId,
        requesterResolvedAt,
        createdAt,
      },
      select: { id: true },
    })

    for (const [offset, comment] of ticket.comments.entries()) {
      await prisma.publicComment.upsert({
        where: { id: comment.id },
        update: { body: comment.body },
        create: {
          id: comment.id,
          ticketId: stored.id,
          authorId: require(userIds, comment.authorEmail, 'user'),
          body: comment.body,
          createdAt: at(index * 5 + offset + 1),
        },
      })
    }

    for (const [offset, note] of ticket.notes.entries()) {
      await prisma.internalNote.upsert({
        where: { id: note.id },
        update: { body: note.body },
        create: {
          id: note.id,
          ticketId: stored.id,
          authorId: require(userIds, note.authorEmail, 'user'),
          body: note.body,
          createdAt: at(index * 5 + offset + 2),
        },
      })
    }
  }
}

async function main(): Promise<void> {
  await seedReferenceData()
  const userIds = await seedUsers()
  await seedTickets(userIds)

  const [categories, relatedSystems, users, admins, tickets, comments, notes] =
    await Promise.all([
      prisma.category.count(),
      prisma.relatedSystem.count(),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } }),
      prisma.ticket.count(),
      prisma.publicComment.count(),
      prisma.internalNote.count(),
    ])

  console.log(
    `Seeded ${categories} categories, ${relatedSystems} related systems, ` +
      `${users} users (${admins} active administrator), ${tickets} tickets, ` +
      `${comments} public comments, ${notes} internal notes.`,
  )
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
