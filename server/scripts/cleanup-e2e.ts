import { unlink } from 'node:fs/promises'
import path from 'node:path'
import prisma from '../src/prisma.js'

function readSummaries(): string[] {
  const raw = process.env.E2E_CLEANUP_SUMMARIES
  if (!raw) throw new Error('E2E_CLEANUP_SUMMARIES is required.')

  const summaries: unknown = JSON.parse(raw)
  if (
    !Array.isArray(summaries) ||
    summaries.length === 0 ||
    summaries.some(
      (summary) =>
        typeof summary !== 'string' ||
        summary.length === 0 ||
        !summary.startsWith('E2E '),
    )
  ) {
    throw new Error(
      'E2E_CLEANUP_SUMMARIES must be a non-empty array of E2E summaries.',
    )
  }

  return summaries
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required.')

  const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, '')
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing E2E cleanup for non-test database "${databaseName}".`)
  }

  const summaries = readSummaries()
  const tickets = await prisma.ticket.findMany({
    where: { summary: { in: summaries } },
    select: { id: true },
  })
  const ticketIds = tickets.map(({ id }) => id)

  if (ticketIds.length === 0) return

  const attachments = await prisma.attachment.findMany({
    where: { ticketId: { in: ticketIds } },
    select: { storedFilename: true },
  })
  const uploadDirectory = path.resolve(process.cwd(), 'uploads')
  for (const { storedFilename } of attachments) {
    await unlink(path.join(uploadDirectory, storedFilename)).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  }

  await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } })
  await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } })
  console.log(`Cleaned ${ticketIds.length} E2E ticket(s).`)
}

main()
  .catch((error) => {
    console.error('E2E cleanup failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
