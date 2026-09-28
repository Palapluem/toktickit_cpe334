// STYLE-01 · STY-001 / STY-003: guard the shared Zen Green source contract.
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(file)
    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [file] : []
  })
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

const RAW_COLOR = /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(/i
const BOOTSTRAP_COLOR_CLASS = /(?:^|[\s"'`])(?:bg|text|btn|border)-(?:primary|secondary|success|danger|warning|info|light|dark)\b/m

describe('STYLE-01 · STY-001 / STY-003 · theme source audit', () => {
  const files = sourceFiles(path.resolve('src'))

  it('keeps colour literals inside the global :root token definitions', () => {
    const violations = files.flatMap((file) => {
      const content = withoutComments(readFileSync(file, 'utf8'))
      const outsideTokens = file.endsWith(`${path.sep}theme.css`)
        ? content.replace(/:root\s*\{[\s\S]*?^\}/m, '')
        : content
      return RAW_COLOR.test(outsideTokens) ? [path.relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not apply Bootstrap colour utilities to the Zen Green screens', () => {
    const violations = files.flatMap((file) => {
      const content = withoutComments(readFileSync(file, 'utf8'))
      return BOOTSTRAP_COLOR_CLASS.test(content)
        ? [path.relative(process.cwd(), file)]
        : []
    })

    expect(violations).toEqual([])
  })
})
