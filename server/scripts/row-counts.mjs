// Migration evidence (L3-2): row counts before and after the User migration.
// Prints the database name only — never the connection string (SEC-032).
import { config } from 'dotenv'
import pg from 'pg'

const envFile = process.argv[2] ?? '.env'
config({ path: envFile, override: true, quiet: true })

const url = process.env.DATABASE_URL
if (!url) {
  console.error(`DATABASE_URL is not set in ${envFile}.`)
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()

const { rows: tables } = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
)

console.log(`database: ${new URL(url).pathname.replace(/^\//, '')}  (${envFile})`)
for (const { tablename } of tables) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM "${tablename}"`)
  console.log(`  ${tablename.padEnd(22)} ${rows[0].n}`)
}

await client.end()
