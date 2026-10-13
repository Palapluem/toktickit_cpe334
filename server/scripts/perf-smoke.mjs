// PERF-01/02 · AC-40 · constant-operation dashboard smoke on an isolated _test database.
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'

config({ path: '.env.test', override: true })
if (process.env.TEST_DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL.trim()
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('Set DATABASE_URL through the ignored test environment.')
const databaseName = decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ''))
if (!databaseName.endsWith('_test') || ['toktickit_dev', 'toktickit_test', 'toktickit_e2e_test'].includes(databaseName)) {
  throw new Error(`Refusing performance data in non-dedicated database "${databaseName}".`)
}

const { default: prisma } = await import('../src/prisma.ts')
const { createApp } = await import('../src/app.ts')
const { DEVELOPMENT_PASSWORD } = await import('../src/seed/roster.ts')
const { PrismaClient } = await import('../src/generated/prisma/client.ts')
const { PrismaPg } = await import('@prisma/adapter-pg')

const BAND = 'TKT-2026-938'
const STAFF_EMAIL = 'patricia.evans@example.ac.th'
const REQUESTER_EMAIL = 'jennifer.anderson@example.ac.th'
const ITERATIONS = 20
const TICKET_COUNT = 2_000
const ACTION_COUNT = 6_000
const measuredPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
  log: [{ level: 'query', emit: 'event' }],
})
let sqlQueryCount = 0
measuredPrisma.$on('query', () => { sqlQueryCount += 1 })

async function cleanup() {
  const tickets = await prisma.ticket.findMany({
    where: { ticketNo: { startsWith: BAND } },
    select: { id: true },
  })
  const ids = tickets.map(({ id }) => id)
  if (ids.length === 0) return
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ids } } })
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } })
}

async function insertDataset(start, count, users, references) {
  const tickets = Array.from({ length: count }, (_, offset) => ({
    ticketNo: `${BAND}${String(start + offset).padStart(5, '0')}`,
    requesterId: users.requesterId,
    categoryId: references.categoryId,
    relatedSystemId: references.relatedSystemId,
    summary: `Dashboard performance fixture ${start + offset}`,
    description: 'Synthetic performance data in a disposable test database.',
    requestedPriority: 'MEDIUM',
    itPriority: 'MEDIUM',
    status: 'OPEN',
    ownerId: users.staffId,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, start + offset)),
    updatedAt: new Date(Date.UTC(2026, 0, 1, 0, start + offset)),
  }))
  const ticketIds = []
  for (let index = 0; index < tickets.length; index += 500) {
    const batch = tickets.slice(index, index + 500)
    const inserted = await prisma.ticket.createManyAndReturn({ data: batch, select: { id: true } })
    ticketIds.push(...inserted.map(({ id }) => id))
  }

  const actions = ticketIds.flatMap((ticketId) => Array.from({ length: 3 }, () => ({
    ticketId,
    description: 'Synthetic open Action for the bounded dashboard query.',
    status: 'PLANNED',
    assigneeId: users.staffId,
    performedById: users.staffId,
    requestId: randomUUID(),
  })))
  for (let index = 0; index < actions.length; index += 500) {
    await prisma.actionTaken.createMany({ data: actions.slice(index, index + 500) })
  }
  return { ticketCount: tickets.length, actionCount: actions.length }
}

function p95(samples) {
  const sorted = [...samples].sort((left, right) => left - right)
  return Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2))
}

async function main() {
  await cleanup()
  const [requester, staff, category, relatedSystem] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: REQUESTER_EMAIL }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { email: STAFF_EMAIL }, select: { id: true } }),
    prisma.category.findFirstOrThrow({ select: { id: true } }),
    prisma.relatedSystem.findFirstOrThrow({ select: { id: true } }),
  ])
  const users = { requesterId: requester.id, staffId: staff.id }
  const references = { categoryId: category.id, relatedSystemId: relatedSystem.id }
  const server = createApp({ db: measuredPrisma }).listen(0, '127.0.0.1')
  try {
    await new Promise((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Could not bind the local performance server.')
    const baseUrl = `http://127.0.0.1:${address.port}`
    await prisma.user.updateMany({ data: { mustChangePassword: false } })
    const login = async (email) => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: DEVELOPMENT_PASSWORD }),
      })
      if (!response.ok) throw new Error(`Seeded test login failed (${response.status}).`)
      return response.headers.get('set-cookie')?.split(';')[0]
    }
    const staffCookie = await login(STAFF_EMAIL)
    const requesterCookie = await login(REQUESTER_EMAIL)
    if (!staffCookie || !requesterCookie) throw new Error('Login did not establish test sessions.')

    await insertDataset(1, 200, users, references)
    const countAt200 = {}
    for (const [name, cookie] of [['staff', staffCookie], ['requester', requesterCookie]]) {
      sqlQueryCount = 0
      const response = await fetch(`${baseUrl}/api/${name}/dashboard`, { headers: { cookie } })
      if (!response.ok) throw new Error(`${name} dashboard failed at 200 Tickets (${response.status}).`)
      countAt200[name] = sqlQueryCount
    }

    await insertDataset(201, 1_800, users, references)
    const countAt2000 = {}
    for (const [name, cookie] of [['staff', staffCookie], ['requester', requesterCookie]]) {
      sqlQueryCount = 0
      const response = await fetch(`${baseUrl}/api/${name}/dashboard`, { headers: { cookie } })
      if (!response.ok) throw new Error(`${name} dashboard failed at 2,000 Tickets (${response.status}).`)
      countAt2000[name] = sqlQueryCount
      if (countAt2000[name] !== countAt200[name]) {
        throw new Error(`${name} dashboard SQL query count grew with dataset size.`)
      }
    }

    const latency = {}
    for (const [name, cookie] of [['staff', staffCookie], ['requester', requesterCookie]]) {
      const samples = []
      for (let index = 0; index < ITERATIONS; index += 1) {
        const started = performance.now()
        const response = await fetch(`${baseUrl}/api/${name}/dashboard`, { headers: { cookie } })
        if (!response.ok) throw new Error(`${name} dashboard failed in timing sample (${response.status}).`)
        const payload = (await response.json()).data
        if (payload.recentlyUpdated.length > 5 || (name === 'staff' && payload.myOpenActions.items.length > 10)) {
          throw new Error(`${name} dashboard returned an unbounded list.`)
        }
        samples.push(performance.now() - started)
      }
      latency[name] = { samples: ITERATIONS, p95Ms: p95(samples) }
    }

    const results = {
      machine: { platform: `${os.type()} ${os.release()}`, arch: os.arch(), cpu: os.cpus()[0]?.model ?? 'unknown', node: process.version },
      dataset: { syntheticTickets: TICKET_COUNT, syntheticActions: ACTION_COUNT, baselineSeedTickets: 10, baselineSeedActions: 8 },
      sqlQueriesPerRequest: { at200: countAt200, at2000: countAt2000 },
      latencyAt2000: latency,
    }
    console.log(JSON.stringify(results, null, 2))
    if (Object.values(latency).some((result) => result.p95Ms > 300)) {
      throw new Error('AC-40 failed: a dashboard p95 exceeded 300 ms.')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await cleanup()
    await prisma.user.updateMany({ data: { mustChangePassword: true } })
  }
}

try {
  await main()
} finally {
  await measuredPrisma.$disconnect()
  await prisma.$disconnect()
}
