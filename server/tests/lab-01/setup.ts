import { config } from 'dotenv'

// Point automated tests at the dedicated test database, never the dev database.
config({ path: '.env.test', override: true })
