// UI-18 · AC-32 · role navigation and post-login home are Dashboard first.
import { describe, expect, it } from 'vitest'
import { homeFor, navigationFor } from '../../src/routes.js'

describe('UI-18 · AC-32 · dashboard is first and is each role’s landing page', () => {
  it.each([
    ['REQUESTER', '/dashboard'],
    ['IT_STAFF', '/staff/dashboard'],
    ['ADMINISTRATOR', '/staff/dashboard'],
  ] as const)('%s lands on the first Dashboard navigation item', (role, path) => {
    const navigation = navigationFor(role)
    expect(navigation[0]).toEqual({ label: 'Dashboard', path })
    expect(homeFor(role)).toBe(path)
  })
})
