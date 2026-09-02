import fs from 'node:fs'
import path from 'node:path'

const E2E_DATABASE_NAME = 'toktickit_e2e_test'

function readDatabaseUrl(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined

  const line = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trimStart().startsWith('DATABASE_URL='))
  if (!line) return undefined

  return line.slice(line.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2')
}

function databaseName(urlValue: string): string {
  return new URL(urlValue).pathname.replace(/^\/+/, '')
}

export function getE2EDatabaseUrl(): string {
  const repoRoot = process.cwd()
  const explicitUrl = process.env.E2E_DATABASE_URL
  const sourceUrl =
    explicitUrl ??
    readDatabaseUrl(path.join(repoRoot, 'server', '.env.e2e')) ??
    readDatabaseUrl(path.join(repoRoot, 'server', '.env.test'))

  if (!sourceUrl) {
    throw new Error(
      'E2E_DATABASE_URL is required, or server/.env.e2e/server/.env.test must define DATABASE_URL.',
    )
  }

  const sourceDatabaseName = databaseName(sourceUrl)
  if (sourceDatabaseName === 'toktickit_dev' || !sourceDatabaseName.endsWith('_test')) {
    throw new Error(
      `Refusing E2E database "${sourceDatabaseName}"; use a disposable database ending in _test.`,
    )
  }

  const targetUrl = new URL(sourceUrl)
  if (sourceDatabaseName === 'toktickit_test') {
    targetUrl.pathname = `/${E2E_DATABASE_NAME}`
  }

  return targetUrl.toString()
}
