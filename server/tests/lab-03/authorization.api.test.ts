// SEC-T01, SEC-T07 … SEC-T14. The direct-API authorization evidence Part 7 asks
// for by name. Every call here goes straight to the API as the wrong role: a
// test that drives the interface proves the button is hidden, and nothing more.
import { afterAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { OPERATIONS, grantFor, type Operation } from '../../src/auth/matrix.js'
import type { Role } from '../../src/auth/types.js'
import {
  ADMIN_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  matrixApp,
  restoreSeededCredentials,
  signIn,
} from './auth-fixtures.js'

const EMAIL_FOR: Record<Role, string> = {
  REQUESTER: REQUESTER_EMAIL,
  IT_STAFF: STAFF_EMAIL,
  ADMINISTRATOR: ADMIN_EMAIL,
}

const ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

const cookies = new Map<Role, string>()

async function cookieFor(role: Role): Promise<string> {
  if (!cookies.has(role)) cookies.set(role, await signIn(EMAIL_FOR[role]))
  return cookies.get(role)!
}

afterAll(async () => {
  await restoreSeededCredentials()
})

describe('SEC-T01 · an unauthenticated caller reaches nothing (AC-12)', () => {
  it('refuses every operation with 401, never 403', async () => {
    expect(OPERATIONS.length).toBeGreaterThan(0)
    for (const operation of OPERATIONS) {
      const response = await request(matrixApp()).get(`/ops/${operation}`)
      expect(response.status, `${operation} unauthenticated`).toBe(401)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    }
  })
})

describe('SEC-T07 … SEC-T09 · every refused cell refuses over the wire', () => {
  for (const role of ROLES) {
    it(`refuses ${role} every operation the matrix denies it`, async () => {
      const cookie = await cookieFor(role)
      const denied = OPERATIONS.filter((operation) => grantFor(role, operation) === null)
      const granted = OPERATIONS.filter((operation) => grantFor(role, operation) !== null)

      // The positive control: this role can reach something, so a chain that
      // refused everything would not pass.
      expect(granted.length).toBeGreaterThan(0)

      for (const operation of denied) {
        const response = await request(matrixApp())
          .get(`/ops/${operation}`)
          .set('Cookie', cookie)
        expect(response.status, `${role} → ${operation}`).toBe(403)
        expect(response.body.error.code).toBe('FORBIDDEN')
      }
    })

    it(`admits ${role} to every operation the matrix grants it, with the right scope`, async () => {
      const cookie = await cookieFor(role)
      const granted = OPERATIONS.filter((operation) => grantFor(role, operation) !== null)
      expect(granted.length).toBeGreaterThan(0)

      for (const operation of granted) {
        const response = await request(matrixApp())
          .get(`/ops/${operation}`)
          .set('Cookie', cookie)
        expect(response.status, `${role} → ${operation}`).toBe(200)
        expect(response.body.data.grant).toBe(grantFor(role, operation))
      }
    })
  }
})

describe('SEC-T11 · a role sent by the client decides nothing (BR-13, SEC-005)', () => {
  const ADMIN_ONLY: Operation = 'user:list'

  it('ignores a role header, a role body field, and a role cookie', async () => {
    // The positive control: an Administrator does reach this operation.
    expect(
      (
        await request(matrixApp())
          .get(`/ops/${ADMIN_ONLY}`)
          .set('Cookie', await cookieFor('ADMINISTRATOR'))
      ).status,
    ).toBe(200)

    const cookie = await cookieFor('REQUESTER')
    const attempts = [
      request(matrixApp()).get(`/ops/${ADMIN_ONLY}`).set('Cookie', cookie).set('X-Role', 'ADMINISTRATOR'),
      request(matrixApp()).get(`/ops/${ADMIN_ONLY}`).set('Cookie', `${cookie}; role=ADMINISTRATOR`),
      request(matrixApp()).get(`/ops/${ADMIN_ONLY}`).set('Cookie', cookie).send({ role: 'ADMINISTRATOR' }),
    ]

    for (const attempt of attempts) {
      const response = await attempt
      expect(response.status).toBe(403)
    }
  })

  it('refuses a forged session cookie', async () => {
    const response = await request(matrixApp())
      .get(`/ops/${ADMIN_ONLY}`)
      .set('Cookie', 'toktickit_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    expect(response.status).toBe(401)
  })
})

describe('SEC-T13 · a refusal body carries nothing internal (SEC-025)', () => {
  it('answers with the envelope and no stack trace, SQL, or file path', async () => {
    const response = await request(matrixApp())
      .get('/ops/user:list')
      .set('Cookie', await cookieFor('REQUESTER'))

    expect(response.status).toBe(403)
    expect(Object.keys(response.body)).toEqual(['error'])
    expect(Object.keys(response.body.error).sort()).toEqual([
      'code',
      'correlationId',
      'fieldErrors',
      'message',
    ])

    const serialized = JSON.stringify(response.body)
    for (const shape of [/ at .+:\d+:\d+/, /SELECT |INSERT |prisma/i, /[A-Za-z]:\\\\|\/src\//]) {
      expect(serialized, `leaked ${shape}`).not.toMatch(shape)
    }
  })

  it('says the same thing whichever refused operation was asked for', async () => {
    const cookie = await cookieFor('REQUESTER')
    const bodies = await Promise.all(
      ['user:list', 'note:read', 'staffQueue:read'].map(async (operation) => {
        const response = await request(matrixApp()).get(`/ops/${operation}`).set('Cookie', cookie)
        expect(response.status, operation).toBe(403)
        return { code: response.body.error.code, message: response.body.error.message }
      }),
    )

    expect(bodies).toHaveLength(3)
    expect(bodies[1]).toEqual(bodies[0])
    expect(bodies[2]).toEqual(bodies[0])
  })
})

describe('SEC-T14 · injection-shaped input is handled safely (SEC-027)', () => {
  it('refuses an operation name carrying SQL without surfacing a database error', async () => {
    const cookie = await cookieFor('ADMINISTRATOR')
    const hostile = [
      "user:list'; DROP TABLE \"User\"; --",
      'user:list OR 1=1',
      '../../user:list',
    ]

    for (const operation of hostile) {
      const response = await request(matrixApp())
        .get(`/ops/${encodeURIComponent(operation)}`)
        .set('Cookie', cookie)
      // No such route: a 404 from Express, never a 500 carrying a driver error.
      expect([403, 404]).toContain(response.status)
      expect(JSON.stringify(response.body)).not.toMatch(/SELECT |syntax error|prisma/i)
    }
  })
})
