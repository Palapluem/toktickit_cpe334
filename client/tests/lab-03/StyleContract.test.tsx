// STYLE-01 · STY-001 / STY-003: guard the shared Zen Green source contract.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = [path.resolve('src'), path.resolve('client/src')].find(existsSync)
if (!SOURCE_ROOT) throw new Error('Could not locate the client src directory.')
const CLIENT_ROOT = path.dirname(SOURCE_ROOT)

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

function hasRawColorOutsideRootBlocks(source: string): boolean {
  const content = withoutComments(source)
  const outsideTokens = content.replace(/:root\b[^{}]*\{[^{}]*\}/gs, '')
  return RAW_COLOR.test(outsideTokens)
}

describe('STYLE-01 · STY-001 / STY-003 · theme source audit', () => {
  it('treats every :root block as a token block', () => {
    const theme = [
      ':root { --surface: #ffffff; }',
      ':root { --surface-dark: #111111; }',
    ].join('\n')

    expect(hasRawColorOutsideRootBlocks(theme)).toBe(false)
    expect(hasRawColorOutsideRootBlocks(`${theme}\n.button { color: #ff0000; }`)).toBe(true)
  })

  const files = sourceFiles(SOURCE_ROOT)

  it('keeps colour literals inside the global :root token definitions', () => {
    const violations = files.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const hasOutsideColor = file.endsWith(`${path.sep}theme.css`)
        ? hasRawColorOutsideRootBlocks(content)
        : RAW_COLOR.test(withoutComments(content))
      return hasOutsideColor ? [path.relative(CLIENT_ROOT, file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not apply Bootstrap colour utilities to the Zen Green screens', () => {
    const violations = files.flatMap((file) => {
      const content = withoutComments(readFileSync(file, 'utf8'))
      return BOOTSTRAP_COLOR_CLASS.test(content)
        ? [path.relative(CLIENT_ROOT, file)]
        : []
    })

    expect(violations).toEqual([])
  })
})
