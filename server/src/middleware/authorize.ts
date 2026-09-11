// Role enforcement in front of a handler (SEC-016). Runs before the handler
// does any work, and decides only from the session's role (SEC-005).
import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../http/errors.js'
import { logSecurityEvent } from '../http/securityLog.js'
import { grantFor, type Operation, type Scope } from '../auth/matrix.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** How far this caller's grant reaches, for the handler to scope its query. */
      grant?: Scope
    }
  }
}

export function requireOperation(operation: Operation) {
  return function authorize(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    // Unauthenticated is requireAuth's answer, not this one; reaching here
    // without a user means the chain was assembled wrong.
    const role = req.user?.role
    const grant = role === undefined ? null : grantFor(role, operation)

    if (grant === null) {
      logSecurityEvent('FORBIDDEN', { operation, role })
      sendError(
        res,
        403,
        'FORBIDDEN',
        'You do not have permission to perform this action.',
      )
      return
    }

    req.grant = grant
    next()
  }
}
