import { config } from 'dotenv'

// Tests use the dedicated test database, never the development one (§11.16).
config({ path: '.env.test', override: true })
