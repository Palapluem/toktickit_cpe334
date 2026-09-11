// Session resolution and the must-change gate (api-spec.md §1, §4).
// The UI's hidden control is feedback; this is the control (SEC-016).
import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../http/errors.js'
import { logSecurityEvent } from '../http/securityLog.js'
import { SESSION_COOKIE, resolveSession } from '../auth/session.js'
import type { AuthenticatedUser } from '../auth/types.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      sessionToken?: string
    }
  }
}

/** 401 for absent, unknown, expired, or deactivated. Sets req.user otherwise. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE]
  const user = typeof token === 'string' ? await resolveSession(token) : null

  if (user === null) {
    logSecurityEvent('SESSION_INVALID', { path: req.path })
    sendError(
      res,
      401,
      'AUTHENTICATION_REQUIRED',
      'Sign in to continue.',
    )
    return
  }

  req.user = user
  req.sessionToken = token as string
  next()
}

/** 403, not 401 — the session is valid; the account state forbids the request. */
export function requirePasswordChanged(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.mustChangePassword === true) {
    sendError(
      res,
      403,
      'PASSWORD_CHANGE_REQUIRED',
      'Set a new password before continuing.',
    )
    return
  }
  next()
}
