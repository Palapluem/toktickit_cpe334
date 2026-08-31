// UNIT-04 (#20). BR-26/BR-27; TC-013/TC-022.
import { describe, expect, it } from 'vitest'
import { validateAttachment } from '../../src/tickets/attachmentRules.js'

function file(overrides: Partial<{
  originalFilename: string
  mimeType: string
  sizeBytes: number
}> = {}) {
  return {
    originalFilename: 'evidence.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    buffer: Buffer.from('bytes'),
    ...overrides,
  }
}

describe('UNIT-04 · attachment rule validation', () => {
  it('rejects a file over 5 MB with the specified status and code', () => {
    expect(
      validateAttachment(file({ sizeBytes: 5 * 1024 * 1024 + 1 }), 0),
    ).toMatchObject({
      status: 413,
      code: 'FILE_TOO_LARGE',
      field: 'attachments[0]',
    })
  })

  it('rejects a disallowed extension or MIME type', () => {
    expect(
      validateAttachment(
        file({
          originalFilename: 'payload.exe',
          mimeType: 'application/octet-stream',
        }),
        1,
      ),
    ).toMatchObject({
      status: 415,
      code: 'UNSUPPORTED_FILE_TYPE',
      field: 'attachments[1]',
    })
  })
})
