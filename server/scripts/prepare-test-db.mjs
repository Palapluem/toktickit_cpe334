/**
 * Bring the dedicated test database up to date, then seed its reference data.
 *
 * `specification.md` §11.16 makes reference data a once-per-run fixture: it is
 * read-only to every test, so restoring it per test would cost time to rebuild
 * something nothing mutates. Transactional data is each test's own.
 *
 * Lab 1 left this undefined — `tests/setup.ts` pointed at `.env.test` and the
 * Categories test simply assumed a database that somebody had prepared by hand.
 * That assumption is not reproducible from a clean clone, and TCS-03 does not
 * permit it.
 *
 * The guard below is the point of this file: it refuses to run against any
 * database whose name does not end in `_test`. `prisma migrate deploy` will
 * happily rewrite whatever DATABASE_URL points at, and a mistyped variable
 * would otherwise reach the development database holding the screenshots.
 */
import { execFileSync } from 'node:child_process'
import { config } from 'dotenv'

config({ path: '.env.test', override: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error(
    'DATABASE_URL is not set. Copy .env.example to .env.test and point it at a ' +
      'database whose name ends in _test.',
  )
  process.exit(1)
}

const databaseName = new URL(url).pathname.replace(/^\//, '')
if (!databaseName.endsWith('_test')) {
  console.error(
    `Refusing to run: DATABASE_URL in .env.test points at "${databaseName}", ` +
      'which is not a test database. Its name must end in _test.',
  )
  process.exit(1)
}

const run = (args) =>
  execFileSync('npx', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  })

console.log(`Preparing test database "${databaseName}"...`)
run(['prisma', 'migrate', 'deploy'])
run(['tsx', 'prisma/seed.ts'])
console.log('Test database ready.')
