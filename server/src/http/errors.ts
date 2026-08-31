// Shared error envelope (api-spec.md §1). Messages are safe to display; internals
// never reach the client (TC-008).
import { randomUUID } from 'node:crypto'
import type { Response } from 'express'

export type FieldError = { field: string; message: string }

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fieldErrors: FieldError[] = [],
): void {
  const correlationId = randomUUID()

  // Logged with the correlation id so a support request can be traced back
  // without the response carrying anything internal.
  if (status >= 500) {
    console.error(`[${correlationId}] ${code}: ${message}`)
  }

  res.status(status).json({
    error: { code, message, fieldErrors, correlationId },
  })
}
