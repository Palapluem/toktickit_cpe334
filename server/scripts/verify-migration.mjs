// Lab 4 migration and recovery check (MIG-01, MIG-02; AC-38, BR-41).
// Builds a populated Lab 3-state database, dumps it, applies the Lab 4 migration, compares every
// pre-existing table, then restores the dump into a second database. Disposable `_test` databases
// only; prints database names, never connection strings.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import pg from 'pg'

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LAB4_MIGRATION = '20261004000000_lab4_actions_taken_and_history'
const KEEP = process.argv.includes('--keep')
const OLD_TABLES = [
  'User', 'Session', 'Category', 'RelatedSystem', 'Ticket', 'Attachment',
  'PublicComment', 'InternalNote', 'TicketNumberSequence',
]

config({ path: path.join(SERVER_DIR, '.env.test'), override: true, quiet: true })
const baseUrl = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL
if (!baseUrl) throw new Error('DATABASE_URL is not set; copy .env.example to .env.test.')
const base = new URL(baseUrl)
const baseName = decodeURIComponent(base.pathname.slice(1))
if (!baseName.endsWith('_test')) throw new Error(`Refusing "${baseName}": the name must end in _test.`)

const urlFor = (name) => { const u = new URL(base); u.pathname = `/${name}`; return u.toString() }
const stamp = Date.now()
const BEFORE = `toktickit_mig_${stamp}_before_test`
const RESTORED = `toktickit_mig_${stamp}_restored_test`
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const admin = async (sql) => {
  const c = new pg.Client({ connectionString: urlFor('postgres') })
  await c.connect()
  try { await c.query(sql) } finally { await c.end() }
}
const withDb = async (name, fn) => {
  const c = new pg.Client({ connectionString: urlFor(name) })
  await c.connect()
  try { return await fn(c) } finally { await c.end() }
}
const redact = (text) => String(text).replace(/postgres(ql)?:\/\/\S+/gi, '<url>')
const run = (cmd, args, env = {}) => {
  try {
    return execFileSync(cmd, args, { cwd: SERVER_DIR, env: { ...process.env, ...env }, encoding: 'utf8', stdio: 'pipe' })
  } catch (error) {
    throw new Error(`${cmd} ${args.join(' ')} failed:\n${redact(error.stderr || error.stdout || error.message)}`)
  }
}
const pgEnv = () => ({
  PGHOST: base.hostname, PGPORT: base.port || '5432',
  PGUSER: decodeURIComponent(base.username), PGPASSWORD: decodeURIComponent(base.password),
})

// Lab 3's migrations only, in a throwaway Prisma project, so "the Lab 3 state" is built by the real tool.
function lab3Project() {
  const dir = mkdtempSync(path.join(tmpdir(), 'l4mig-'))
  const migrations = path.join(dir, 'migrations')
  mkdirSync(migrations)
  for (const entry of readdirSync(path.join(SERVER_DIR, 'prisma/migrations'))) {
    if (entry === LAB4_MIGRATION) continue
    cpSync(path.join(SERVER_DIR, 'prisma/migrations', entry), path.join(migrations, entry), { recursive: true })
  }
  cpSync(path.join(SERVER_DIR, 'prisma/schema.prisma'), path.join(dir, 'schema.prisma'))
  const configPath = path.join(dir, 'prisma.config.mjs')
  writeFileSync(configPath, `export default { schema: ${JSON.stringify(path.join(dir, 'schema.prisma'))}, migrations: { path: ${JSON.stringify(migrations)} }, datasource: { url: process.env.DATABASE_URL } }\n`)
  return { dir, configPath }
}

async function loadLab3Fixture(db) {
  const id = () => randomUUID()
  const at = (day) => new Date(Date.UTC(2026, 8, day, 3, 0, 0))
  const roles = [
    ['REQUESTER', true], ['REQUESTER', true], ['REQUESTER', true], ['REQUESTER', true], ['REQUESTER', false],
    ['IT_STAFF', true], ['IT_STAFF', true], ['IT_STAFF', true], ['IT_STAFF', false], ['ADMINISTRATOR', true],
  ]
  const users = []
  for (const [i, [role, active]] of roles.entries()) {
    const u = { id: id(), role, active }
    users.push(u)
    await db.query(
      'INSERT INTO "User" ("id","displayName","email","passwordHash","role","mustChangePassword","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)',
      [u.id, `Fixture User ${i}`, `fixture${i}@example.ac.th`, 'not-a-real-hash', role, i % 2 === 0, active, at(1)],
    )
  }
  const cats = [], systems = []
  for (let i = 0; i < 4; i++) { const c = id(); cats.push(c); await db.query('INSERT INTO "Category" ("id","name","isActive","createdAt") VALUES ($1,$2,true,$3)', [c, `Category ${i}`, at(1)]) }
  for (let i = 0; i < 7; i++) { const s = id(); systems.push(s); await db.query('INSERT INTO "RelatedSystem" ("id","name","isActive","createdAt") VALUES ($1,$2,true,$3)', [s, `System ${i}`, at(1)]) }
  const requesters = users.filter((u) => u.role === 'REQUESTER' && u.active)
  const staff = users.filter((u) => u.role !== 'REQUESTER' && u.active)
  const statuses = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  const tickets = []
  for (let i = 0; i < 24; i++) {
    const t = { id: id(), requester: requesters[i % requesters.length].id }
    tickets.push(t)
    const status = statuses[i % statuses.length]
    const owner = status === 'NEW' ? null : staff[i % staff.length].id
    await db.query(
      'INSERT INTO "Ticket" ("id","ticketNo","requesterId","categoryId","relatedSystemId","summary","description","requestedPriority","itPriority","status","ownerId","requesterResolvedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)',
      [t.id, `TKT-2026-${String(i + 1).padStart(6, '0')}`, t.requester, cats[i % cats.length], systems[i % systems.length], `Fixture ticket ${i}`, 'Populated Lab 3 data for the migration check.', priorities[i % 4], priorities[(i + 1) % 4], status, owner, i % 5 === 0 ? at(9) : null, at(2 + (i % 20))],
    )
  }
  for (let i = 0; i < 6; i++) {
    await db.query(
      'INSERT INTO "Attachment" ("id","ticketId","originalFilename","storedFilename","mimeType","sizeBytes","uploadedById","createdAt","removedAt","removedReason","removedById") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [id(), tickets[i].id, `file-${i}.png`, `stored-${stamp}-${i}`, 'image/png', 1024 + i, tickets[i].requester, at(3), i < 2 ? at(4) : null, i < 2 ? 'Wrong file' : null, i < 2 ? tickets[i].requester : null],
    )
  }
  for (let i = 0; i < 30; i++) await db.query('INSERT INTO "PublicComment" ("id","ticketId","authorId","body","createdAt") VALUES ($1,$2,$3,$4,$5)', [id(), tickets[i % 24].id, staff[i % staff.length].id, `Public comment ${i}`, at(5)])
  for (let i = 0; i < 12; i++) await db.query('INSERT INTO "InternalNote" ("id","ticketId","authorId","body","createdAt") VALUES ($1,$2,$3,$4,$5)', [id(), tickets[i % 24].id, staff[i % staff.length].id, `Internal note ${i}`, at(5)])
  for (let i = 0; i < 3; i++) await db.query('INSERT INTO "Session" ("id","userId","expiresAt","createdAt") VALUES ($1,$2,$3,$4)', [`fixture-session-${stamp}-${i}`, staff[i % staff.length].id, new Date(Date.now() + 3_600_000), at(6)])
  await db.query('INSERT INTO "TicketNumberSequence" ("year","lastValue","updatedAt") VALUES (2026,24,$1)', [at(6)])
}

async function snapshot(db) {
  const out = {}
  for (const table of OLD_TABLES) {
    const { rows } = await db.query(
      `SELECT count(*)::int AS n, coalesce(md5(string_agg(j, '|' ORDER BY j)), '-') AS h FROM (SELECT (to_jsonb(x) - 'version')::text AS j FROM "${table}" x) y`,
    )
    out[table] = rows[0]
  }
  return out
}
const same = (a, b) => OLD_TABLES.every((t) => a[t].n === b[t].n && a[t].h === b[t].h)
const counts = (s) => OLD_TABLES.map((t) => `${t}=${s[t].n}`).join(' ')

const project = lab3Project()
const dump = path.join(project.dir, 'lab3-state.dump')
try {
  await admin(`CREATE DATABASE "${BEFORE}"`)
  run('npx', ['prisma', 'migrate', 'deploy', '--config', project.configPath], { DATABASE_URL: urlFor(BEFORE) })

  const before = await withDb(BEFORE, async (db) => { await loadLab3Fixture(db); return snapshot(db) })
  console.log(`Lab 3 state loaded in ${BEFORE}: ${counts(before)}`)
  run('pg_dump', ['-Fc', '-f', dump, BEFORE], pgEnv())

  run('npx', ['prisma', 'migrate', 'deploy'], { DATABASE_URL: urlFor(BEFORE) })
  const migrated = existsSync(path.join(SERVER_DIR, 'prisma/migrations', LAB4_MIGRATION))
  check('the Lab 4 migration exists and was applied', migrated, LAB4_MIGRATION)

  await withDb(BEFORE, async (db) => {
    const after = await snapshot(db)
    check('MIG-01 every pre-existing table keeps its row count', OLD_TABLES.every((t) => before[t].n === after[t].n), counts(after))
    check('MIG-01 every pre-existing table keeps its contents', same(before, after))
    const fk = await db.query("SELECT count(*)::int AS n FROM pg_constraint WHERE contype = 'f' AND NOT convalidated")
    check('MIG-01 all foreign keys are validated', fk.rows[0].n === 0)
    const exists = async (table) => (await db.query('SELECT to_regclass($1) IS NOT NULL AS x', [`public."${table}"`])).rows[0].x
    check('the ActionTaken and TicketEvent tables exist', (await exists('ActionTaken')) && (await exists('TicketEvent')))
    if (await exists('ActionTaken')) {
      const legacy = await db.query('SELECT (SELECT count(*)::int FROM "ActionTaken") AS actions, (SELECT count(*)::int FROM "TicketEvent") AS events, (SELECT count(*)::int FROM "Ticket" WHERE "version" <> 1) AS other')
      check('legacy Tickets have no Actions or events and start at version 1', legacy.rows[0].actions === 0 && legacy.rows[0].events === 0 && legacy.rows[0].other === 0)
    } else check('legacy Tickets have no Actions or events and start at version 1', false, 'ActionTaken is missing')
    const trigger = await db.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid = to_regclass('public.\"TicketEvent\"') AND NOT tgisinternal")
    check('the TicketEvent append-only trigger exists', trigger.rows[0].n >= 1)
  })

  let drift = 0
  try { run('npx', ['prisma', 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], { DATABASE_URL: urlFor(BEFORE) }) } catch (error) { drift = 1; console.log(error.message.split('\n').slice(0, 12).join('\n')) }
  check('schema.prisma matches the migrated database (no drift)', drift === 0)

  await admin(`CREATE DATABASE "${RESTORED}"`)
  run('pg_restore', ['--no-owner', '-d', RESTORED, dump], pgEnv())
  const restored = await withDb(RESTORED, snapshot)
  check('MIG-02 restoring the pre-migration dump reproduces the Lab 3 counts', OLD_TABLES.every((t) => before[t].n === restored[t].n), counts(restored))
  check('MIG-02 the restored contents are identical', same(before, restored))
  run('npx', ['prisma', 'migrate', 'deploy'], { DATABASE_URL: urlFor(RESTORED) })
  const remigrated = await withDb(RESTORED, snapshot)
  check('MIG-02 migrating the restored database again gives the same result', same(before, remigrated))
} finally {
  rmSync(project.dir, { recursive: true, force: true })
  if (!KEEP) for (const name of [BEFORE, RESTORED]) await admin(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`).catch(() => {})
}
const failed = results.filter((ok) => !ok).length
console.log(failed === 0 ? `All ${results.length} checks passed.` : `${failed} of ${results.length} checks FAILED.`)
process.exit(failed === 0 ? 0 : 1)
