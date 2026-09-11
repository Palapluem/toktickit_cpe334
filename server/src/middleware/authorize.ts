// Role enforcement in front of a handler. Stub: the tests drive this out.
import type { NextFunction, Request, Response } from 'express'
import type { Operation, Scope } from '../auth/matrix.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** How far this caller's grant reaches, for the handler to scope its query. */
      grant?: Scope
    }
  }
}

export function requireOperation(_operation: Operation) {
  return function authorize(
    _req: Request,
    _res: Response,
    next: NextFunction,
  ): void {
    next()
  }
}
