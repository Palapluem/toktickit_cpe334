import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { getE2EDatabaseUrl } from './environment'

export function cleanupE2ETickets(summaries: string[]): void {
  if (summaries.length === 0) return

  // TCS-03 requires cleanup after each test; a suite-level teardown would
  // leave another test's rows visible while the suite is still running.
  const { FORCE_COLOR: _forceColor, NO_COLOR: _noColor, ...cleanEnv } = process.env
  execFileSync('npx', ['tsx', 'scripts/cleanup-e2e.ts'], {
    cwd: path.resolve(process.cwd(), 'server'),
    env: {
      ...cleanEnv,
      DATABASE_URL: getE2EDatabaseUrl(),
      E2E_CLEANUP_SUMMARIES: JSON.stringify(summaries),
      NO_COLOR: '1',
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
}
