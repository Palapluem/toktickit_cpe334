import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type AttachmentFile = {
  originalFilename: string
  mimeType: string
  sizeBytes: number
  buffer: Buffer
}

export interface AttachmentStorage {
  save(file: AttachmentFile): Promise<{ storedFilename: string }>
  remove(storedFilename: string): Promise<void>
}

const uploadDirectory = path.resolve(process.cwd(), 'uploads')

export const localAttachmentStorage: AttachmentStorage = {
  async save(file) {
    await mkdir(uploadDirectory, { recursive: true })
    const storedFilename = randomUUID()
    await writeFile(path.join(uploadDirectory, storedFilename), file.buffer, {
      flag: 'wx',
    })
    return { storedFilename }
  },
  async remove(storedFilename) {
    await unlink(path.join(uploadDirectory, storedFilename))
  },
}
