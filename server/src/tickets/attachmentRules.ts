import type { AttachmentFile } from './storage.js'

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024
export const MAX_ATTACHMENTS = 5

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

export type AttachmentRuleFailure = {
  status: number
  code: string
  message: string
  field: string
}

export function validateAttachment(
  file: AttachmentFile,
  index: number,
): AttachmentRuleFailure | null {
  const field = `attachments[${index}]`
  if (file.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: `${file.originalFilename} exceeds the 5 MB limit.`,
      field,
    }
  }

  const extension = file.originalFilename
    .slice(file.originalFilename.lastIndexOf('.'))
    .toLowerCase()
  const expectedMime = MIME_BY_EXTENSION[extension]
  if (!expectedMime || file.mimeType.toLowerCase() !== expectedMime) {
    return {
      status: 415,
      code: 'UNSUPPORTED_FILE_TYPE',
      message: `${file.originalFilename} is not permitted. Use a JPG, JPEG, PNG, WEBP, or PDF attachment.`,
      field,
    }
  }

  return null
}
