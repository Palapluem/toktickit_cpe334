// Reviewer finding on PR #57: origin: process.env.CLIENT_ORIGIN ?? true is an
// open credentialed-CORS policy if CLIENT_ORIGIN is ever unset outside dev.
import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app.js'

describe('CORS origin configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalClientOrigin = process.env.CLIENT_ORIGIN

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalClientOrigin === undefined) delete process.env.CLIENT_ORIGIN
    else process.env.CLIENT_ORIGIN = originalClientOrigin
  })

  it('refuses to start in production without CLIENT_ORIGIN set', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CLIENT_ORIGIN
    expect(() => createApp()).toThrow(/CLIENT_ORIGIN/)
  })

  it('still reflects the request origin outside production, for local dev', () => {
    process.env.NODE_ENV = 'test'
    delete process.env.CLIENT_ORIGIN
    expect(() => createApp()).not.toThrow()
  })

  it('never throws once CLIENT_ORIGIN is set, in any environment', () => {
    process.env.NODE_ENV = 'production'
    process.env.CLIENT_ORIGIN = 'https://toktickit.example'
    expect(() => createApp()).not.toThrow()
  })
})
