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

export default function globalSetup(): void {
  const databaseUrl = getE2EDatabaseUrl()
  runNpx(['prisma', 'migrate', 'deploy'], databaseUrl)
  runNpx(['tsx', 'prisma/seed.ts'], databaseUrl)
}
