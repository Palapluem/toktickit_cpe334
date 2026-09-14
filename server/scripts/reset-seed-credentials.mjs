// Puts every seeded account back to the documented development password with
// the must-change gate lifted, for a disposable test database.
//
// The seed deliberately writes credentials on create only, so a password a test
// changed survives a re-seed (BR-06). That is right for the seed and wrong for
// an E2E run, which needs the same starting point every time.
import bcrypt from 'bcryptjs'
import pg from 'pg'
import { DEVELOPMENT_PASSWORD } from '../src/seed/roster.ts'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const databaseName = new URL(url).pathname.replace(/^\//, '')
if (!databaseName.endsWith('_test')) {
  console.error(`Refusing to run against "${databaseName}"; its name must end in _test.`)
  process.exit(1)
}

const passwordHash = await bcrypt.hash(DEVELOPMENT_PASSWORD, 10)
const client = new pg.Client({ connectionString: url })
await client.connect()
const { rowCount } = await client.query(
  'UPDATE "User" SET "passwordHash" = $1, "mustChangePassword" = false',
  [passwordHash],
)
await client.end()
console.log(`Reset credentials on ${rowCount} seeded accounts in ${databaseName}.`)
