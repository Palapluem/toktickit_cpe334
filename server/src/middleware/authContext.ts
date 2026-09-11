// Session resolution and the must-change gate. Stub: the tests drive these out.
import type { NextFunction, Request, Response } from 'express'
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
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  next()
}

/** 403 PASSWORD_CHANGE_REQUIRED — the session is valid; the account state is not. */
export function requirePasswordChanged(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next()
}
