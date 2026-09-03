// API-18 (#17). BR-11, BR-14, §11.21; TDT-01 covers five context classes.
// A probe route isolates the real middleware before requester-scoped endpoints exist.
import express from 'express'
import { describe, expect, it, beforeAll } from 'vitest'
import request from 'supertest'
import prisma from '../../src/prisma.js'
import { requireRequesterContext } from '../../src/middleware/requesterContext.js'

const probe = express()
probe.get('/probe', requireRequesterContext, (req, res) => {
  res.json({ data: { requesterId: req.requester?.id ?? null } })
})

let activeId = ''
let inactiveId = ''

beforeAll(async () => {
  const active = await prisma.requesterUser.findFirstOrThrow({
    where: { isActive: true },
  })
  const inactive = await prisma.requesterUser.findFirstOrThrow({
    where: { isActive: false },
  })
  activeId = active.id
  inactiveId = inactive.id
})

describe('API-18 · a valid requester context is accepted', () => {
  it('resolves the requester and lets the handler run', async () => {
    const response = await request(probe)
      .get('/probe')
      .set('X-Requester-Id', activeId)

    expect(response.status).toBe(200)
    expect(response.body.data.requesterId).toBe(activeId)
  })
})

describe('API-18 · BR-14 · an unusable requester context is rejected', () => {
  it('rejects a missing header rather than defaulting to a requester', async () => {
    const response = await request(probe).get('/probe')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('REQUESTER_CONTEXT_REQUIRED')
  })

  it('rejects an empty header', async () => {
    const response = await request(probe).get('/probe').set('X-Requester-Id', '')

    expect(response.status).toBe(400)
  })

  it('rejects a value that is not a UUID', async () => {
    const response = await request(probe)
      .get('/probe')
      .set('X-Requester-Id', 'not-a-uuid')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('REQUESTER_CONTEXT_REQUIRED')
  })

  it('rejects a well-formed UUID that matches no requester', async () => {
    const response = await request(probe)
      .get('/probe')
      .set('X-Requester-Id', '00000000-0000-4000-8000-000000000000')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('REQUESTER_NOT_FOUND')
  })

  // BR-11. The seed carries an inactive requester precisely so this is provable.
  it('rejects an inactive requester', async () => {
    const response = await request(probe)
      .get('/probe')
      .set('X-Requester-Id', inactiveId)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('REQUESTER_INACTIVE')
  })
})

describe('API-18 · the rejection is safe to display', () => {
  it('returns the shared error envelope with a correlation id', async () => {
    const response = await request(probe).get('/probe')

    expect(response.body.error).toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
    })
    expect(response.body.error.correlationId).toEqual(expect.any(String))
    expect(Array.isArray(response.body.error.fieldErrors)).toBe(true)
  })

  // TC-008: nothing internal leaks into a message a user can see.
  it('leaks no stack trace, SQL, or file path', async () => {
    const response = await request(probe)
      .get('/probe')
      .set('X-Requester-Id', 'not-a-uuid')

    // Status asserted first: a "nothing leaked" check passes for free against a
    // response that carries nothing at all.
    expect(response.status).toBe(400)

    const body = JSON.stringify(response.body)
    expect(body).not.toMatch(/at .*\(.*:\d+:\d+\)/)
    expect(body).not.toMatch(/SELECT |prisma\.|node_modules/i)
  })
})
