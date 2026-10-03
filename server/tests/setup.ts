import { config } from 'dotenv'

// Tests use the dedicated test database, never the development one (§11.16).
config({ path: '.env.test', override: true })

// A fresh verification database may replace it, but only one named as a test database (lab-04 tests.md §5).
const verificationUrl = process.env.TEST_DATABASE_URL?.trim()
if (verificationUrl) {
  const name = decodeURIComponent(new URL(verificationUrl).pathname.replace(/^\/+/, ''))
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing TEST_DATABASE_URL "${name}": the database name must end in _test.`)
  }
  process.env.DATABASE_URL = verificationUrl
}
