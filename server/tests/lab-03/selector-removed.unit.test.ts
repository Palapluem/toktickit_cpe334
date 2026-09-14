// MIG-05, AC-15. The Lab 2 Development Requester selector is deleted, not
// deprecated: a second identity path is a second thing to secure, so the
// assertion is absence from the source tree rather than a 400 on the header.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOTS = ['src', join('..', 'client', 'src')]
const SOURCE_EXTENSIONS = ['.ts', '.tsx']

function sourceFiles(root: string): string[] {
  const entries = readdirSync(root).map((entry) => join(root, entry))
  return entries.flatMap((entry) =>
    statSync(entry).isDirectory()
      ? sourceFiles(entry)
      : SOURCE_EXTENSIONS.some((extension) => entry.endsWith(extension))
        ? [entry]
        : [],
  )
}

function filesContaining(pattern: RegExp): string[] {
  return SOURCE_ROOTS.flatMap(sourceFiles).filter((file) =>
    pattern.test(readFileSync(file, 'utf8')),
  )
}

describe('MIG-05 · AC-15 · the Development Requester selector is gone', () => {
  it('sends no X-Requester-Id header from any client or server source file', () => {
    expect(filesContaining(/X-Requester-Id/i)).toEqual([])
  })

  it('keeps no requester-selection state or selector route', () => {
    expect(filesContaining(/requesterContext|selectedRequesterId|SelectRequester/)).toEqual([])
  })

  it('exposes no GET /api/requesters endpoint', () => {
    expect(filesContaining(/['"`]\/api\/requesters['"`]/)).toEqual([])
  })
})
