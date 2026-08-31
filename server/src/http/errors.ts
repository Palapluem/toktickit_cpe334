// STUB — seam only (testing-contract.md §5). Implemented in the feat: commit.
import type { Response } from 'express'

export type FieldError = { field: string; message: string }

export function sendError(
  _res: Response,
  _status: number,
  _code: string,
  _message: string,
  _fieldErrors: FieldError[] = [],
): void {}
