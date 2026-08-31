export type AttachmentFile = {
  originalFilename: string
  mimeType: string
  sizeBytes: number
  buffer: Buffer
}

export interface AttachmentStorage {
  save(file: AttachmentFile): Promise<{ storedFilename: string }>
}
