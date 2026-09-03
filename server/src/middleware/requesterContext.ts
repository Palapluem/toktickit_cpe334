// Validate X-Requester-Id once before requester-scoped handlers (§11.21).
// Handlers read req.requester; Lab 3 can replace this source without downstream changes (BR-42).
import type { NextFunction, Request, Response } from 'express'
import prisma from '../prisma.js'
import { sendError } from '../http/errors.js'

export type ResolvedRequester = {
  id: string
  displayName: string
  email: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requester?: ResolvedRequester
    }
  }
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function requireRequesterContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header('X-Requester-Id')?.trim()

  if (!header || !UUID.test(header)) {
    sendError(
      res,
      400,
      'REQUESTER_CONTEXT_REQUIRED',
      'A development requester must be selected before using this feature.',
    )
    return
  }

  const requester = await prisma.requesterUser.findUnique({
    where: { id: header },
    select: { id: true, displayName: true, email: true, isActive: true },
  })

  if (!requester) {
    sendError(
      res,
      400,
      'REQUESTER_NOT_FOUND',
      'The selected development requester no longer exists. Choose one again.',
    )
    return
  }

  if (!requester.isActive) {
    sendError(
      res,
      400,
      'REQUESTER_INACTIVE',
      'The selected development requester is no longer active. Choose another.',
    )
    return
  }

  req.requester = {
    id: requester.id,
    displayName: requester.displayName,
    email: requester.email,
  }
  next()
}
