import type { AttachmentFile } from './storage.js'

export type AttachmentRuleFailure = {
  status: number
  code: string
  message: string
  field: string
}

export function validateAttachment(
  _file: AttachmentFile,
  _index: number,
): AttachmentRuleFailure | null {
  return null
}
