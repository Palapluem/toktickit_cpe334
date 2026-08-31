// STUB — seam only (testing-contract.md §5). Implemented in the feat: commit.
import type { NextFunction, Request, Response } from 'express'

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

export async function requireRequesterContext(
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  next()
}
