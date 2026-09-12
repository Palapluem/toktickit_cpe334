import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { getE2EDatabaseUrl } from './environment'

function runNpx(args: string[], databaseUrl: string): void {
  const { FORCE_COLOR: _forceColor, NO_COLOR: _noColor, ...cleanEnv } = process.env
  execFileSync('npx', args, {
    cwd: path.resolve(process.cwd(), 'server'),
    env: { ...cleanEnv, DATABASE_URL: databaseUrl, NO_COLOR: '1' },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
}

/**
 * Lifts the must-change gate on the seeded accounts so every spec can sign in
 * with the documented development password. The gate itself is covered by the
 * API tests, and by the Change Password screen's own journey in L3-6; leaving
 * it set here would only mean each spec logged in through a different password.
 */
function runNode(args: string[], databaseUrl: string): void {
  const { FORCE_COLOR: _forceColor, NO_COLOR: _noColor, ...cleanEnv } = process.env
  execFileSync('npx', ['tsx', ...args], {
    cwd: path.resolve(process.cwd(), 'server'),
    env: { ...cleanEnv, DATABASE_URL: databaseUrl, NO_COLOR: '1' },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
}

export default function globalSetup(): void {
  const databaseUrl = getE2EDatabaseUrl()
  runNpx(['prisma', 'migrate', 'deploy'], databaseUrl)
  runNpx(['tsx', 'prisma/seed.ts'], databaseUrl)
  runNode(['scripts/reset-seed-credentials.mjs'], databaseUrl)
}
