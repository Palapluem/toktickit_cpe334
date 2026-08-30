import { config } from 'dotenv'

// Point automated tests at the dedicated test database, never the development
// database (`specification.md` 11.16). A suite that truncates tables must not be
// one command away from the database holding the submission screenshots.
config({ path: '.env.test', override: true })
