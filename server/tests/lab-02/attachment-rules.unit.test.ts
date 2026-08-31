// UNIT-04 (#20). BR-26/BR-27; TC-013/TC-015/TC-022.
// TDT-01 equivalence partitions for permitted and rejected file types.
// TDT-02 boundary-value analysis for the 5 MB size limit.
import { describe, expect, it } from 'vitest'
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  validateAttachment,
} from '../../src/tickets/attachmentRules.js'

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
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['diagram.png', 'image/png'],
    ['capture.webp', 'image/webp'],
    ['report.pdf', 'application/pdf'],
  ])('accepts the permitted %s type', (originalFilename, mimeType) => {
    expect(
      validateAttachment(
        file({ originalFilename, mimeType, sizeBytes: MAX_ATTACHMENT_SIZE_BYTES }),
        0,
      ),
    ).toBeNull()
  })

  it('rejects a file over 5 MB with the specified status and code', () => {
    expect(
      validateAttachment(file({ sizeBytes: MAX_ATTACHMENT_SIZE_BYTES + 1 }), 0),
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
