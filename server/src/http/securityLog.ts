// Security-relevant failures, with a correlation id (SEC-026).
// Never records a password, hash, token, session id, or raw client input.
import { randomUUID } from 'node:crypto'

export function logSecurityEvent(
  code: string,
  detail: Record<string, string | undefined> = {},
): string {
  const correlationId = randomUUID()
  const fields = Object.entries(detail)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')
  console.warn(`[${correlationId}] SECURITY ${code} ${fields}`.trimEnd())
  return correlationId
}
