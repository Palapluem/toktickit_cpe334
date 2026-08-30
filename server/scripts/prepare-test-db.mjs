// Migrate and seed the dedicated test database (§11.16).
// The name guard matters: migrate deploy rewrites whatever DATABASE_URL points at.
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
