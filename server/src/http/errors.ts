// Shared error envelope (api-spec.md §1). Messages are safe to display; internals
// never reach the client (TC-008).
import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, Response } from 'express'

export type FieldError = { field: string; message: string }

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  fieldErrors: FieldError[] = [],
  correlationId = randomUUID(),
): void {
  // Logged with the correlation id so a support request can be traced back
  // without the response carrying anything internal.
  if (status >= 500) {
    console.error(`[${correlationId}] ${code}: ${message}`)
  }

  res.status(status).json({
    error: { code, message, fieldErrors, correlationId },
  })
}

type BodyParserError = Error & { type?: string }

function isMalformedJson(error: unknown): error is BodyParserError {
  return (
    error instanceof Error &&
    (error as BodyParserError).type === 'entity.parse.failed'
  )
}

// Express's default flow, adapted to the Lab 2 JSON contract (api-spec.md §1).
// Framework stack/HTML output must never reach the client (TC-008).
export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
): void => {
  if (res.headersSent) {
    next(error)
    return
  }

  if (isMalformedJson(error)) {
    sendError(
      res,
      400,
      'VALIDATION_FAILED',
      'Request body must be valid JSON.',
    )
    return
  }

  const correlationId = randomUUID()
  console.error(`[${correlationId}] INTERNAL_ERROR`, error)
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    'An unexpected server error occurred. Please try again.',
    [],
    correlationId,
  )
}
