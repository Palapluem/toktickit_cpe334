// API-01 … API-10. Authentication through the API, never through a screen.
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { DEVELOPMENT_PASSWORD } from '../../src/seed/roster.js'
import { SESSION_COOKIE } from '../../src/auth/session.js'
import {
  ADMIN_EMAIL,
  INACTIVE_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  UNKNOWN_EMAIL,
  clearPasswordGate,
  guardedApp,
  login,
  restoreSeededCredentials,
  signIn,
  signInUnready,
} from './auth-fixtures.js'

const SECRET_SHAPES = /passwordHash|\$2[aby]\$|sessionToken|"token"/i

beforeEach(async () => {
  await restoreSeededCredentials()
})

afterAll(async () => {
  await restoreSeededCredentials()
})

describe('API-01 · a valid login establishes a session (AC-01)', () => {
  it('returns the safe profile', async () => {
    await clearPasswordGate(REQUESTER_EMAIL)
    const result = await login(REQUESTER_EMAIL)

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      data: {
        email: REQUESTER_EMAIL,
        displayName: 'Jennifer Anderson',
        role: 'REQUESTER',
        mustChangePassword: false,
      },
    })
  })

  it('sets an httpOnly, SameSite=Lax session cookie (SEC-013)', async () => {
    const result = await login(REQUESTER_EMAIL)

    expect(result.cookie).not.toBeNull()
    const header = result.setCookie.join(';')
    expect(header).toContain(`${SESSION_COOKIE}=`)
    expect(header).toMatch(/HttpOnly/i)
    expect(header).toMatch(/SameSite=Lax/i)
  })

  it('stores the session server-side so it can be revoked (BR-09)', async () => {
    const before = await prisma.session.count()
    const result = await login(REQUESTER_EMAIL)

    expect(result.status).toBe(200)
    expect(await prisma.session.count()).toBe(before + 1)
  })

  it('reports the role from the server, never from anything the client holds (BR-13)', async () => {
    const cookie = await signIn(STAFF_EMAIL)
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .set('X-Role', 'ADMINISTRATOR')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ data: { role: 'IT_STAFF' } })
  })
})

describe('API-02 … API-04 · every failure looks the same (AC-03, SEC-002)', () => {
  it('refuses an unknown email', async () => {
    // The positive control: this password is the right one for a known account.
    expect((await login(REQUESTER_EMAIL)).status).toBe(200)

    const result = await login(UNKNOWN_EMAIL)
    expect(result.status).toBe(401)
    expect(result.cookie).toBeNull()
  })

  it('refuses a wrong password', async () => {
    expect((await login(REQUESTER_EMAIL)).status).toBe(200)

    const result = await login(REQUESTER_EMAIL, 'definitely-not-the-password')
    expect(result.status).toBe(401)
    expect(result.cookie).toBeNull()
  })

  it('refuses an inactive account holding the correct password (BR-01)', async () => {
    // The positive control: the same password works for an active account.
    expect((await login(REQUESTER_EMAIL)).status).toBe(200)

    const result = await login(INACTIVE_REQUESTER_EMAIL)
    expect(result.status).toBe(401)
    expect(result.cookie).toBeNull()
  })

  it('returns one body the three cases cannot be told apart by', async () => {
    const unknown = await login(UNKNOWN_EMAIL)
    const wrong = await login(REQUESTER_EMAIL, 'definitely-not-the-password')
    const inactive = await login(INACTIVE_REQUESTER_EMAIL)

    const shape = (body: any) => ({
      code: body?.error?.code,
      message: body?.error?.message,
      fieldErrors: body?.error?.fieldErrors,
    })

    expect(shape(unknown.body).code).toBe('INVALID_CREDENTIALS')
    expect(shape(wrong.body)).toEqual(shape(unknown.body))
    expect(shape(inactive.body)).toEqual(shape(unknown.body))
  })

  it('rejects a malformed request before it reaches the credential check', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 42 })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_FAILED')
  })

  it('creates no session for a failed attempt', async () => {
    const before = await prisma.session.count()
    // A successful login does create one, so the count is a real signal here.
    expect((await login(REQUESTER_EMAIL)).status).toBe(200)
    expect(await prisma.session.count()).toBe(before + 1)

    await login(REQUESTER_EMAIL, 'definitely-not-the-password')
    expect(await prisma.session.count()).toBe(before + 1)
  })
})

describe('API-05 · logout revokes access (AC-04, BR-09, SEC-004)', () => {
  it('refuses the next request made with the logged-out session', async () => {
    const cookie = await signIn(REQUESTER_EMAIL)
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(200)

    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    expect(out.status).toBe(200)

    const after = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(after.status).toBe(401)
  })

  it('deletes the row rather than marking it', async () => {
    const cookie = await signIn(REQUESTER_EMAIL)
    const before = await prisma.session.count()

    await request(app).post('/api/auth/logout').set('Cookie', cookie)
    expect(await prisma.session.count()).toBe(before - 1)
  })

  it('answers 200 when there was no session to end', async () => {
    const response = await request(app).post('/api/auth/logout')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { loggedOut: true } })
  })
})

describe('API-06 · the must-change gate (AC-02, BR-02, SEC-008)', () => {
  it('refuses a guarded endpoint with 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const cookie = await signInUnready(REQUESTER_EMAIL)
    const response = await request(guardedApp()).get('/guarded').set('Cookie', cookie)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED')
  })

  it('admits the same user once the password is changed', async () => {
    const cookie = await signInUnready(REQUESTER_EMAIL)
    expect((await request(guardedApp()).get('/guarded').set('Cookie', cookie)).status).toBe(403)

    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: DEVELOPMENT_PASSWORD, newPassword: 'a-longer-new-password' })
    expect(changed.status).toBe(200)

    const after = await request(guardedApp()).get('/guarded').set('Cookie', cookie)
    expect(after.status).toBe(200)
  })

  it('leaves the current-user endpoint open, so the client can learn why', async () => {
    const cookie = await signInUnready(REQUESTER_EMAIL)
    const response = await request(app).get('/api/auth/me').set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ data: { mustChangePassword: true } })
  })

  it('refuses an unauthenticated caller with 401, not 403', async () => {
    const response = await request(guardedApp()).get('/guarded')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
  })
})

describe('API-07 · a wrong current password changes nothing (AC-05)', () => {
  it('refuses the change and leaves the old password working', async () => {
    const cookie = await signIn(REQUESTER_EMAIL)

    const refused = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'wrong-current', newPassword: 'a-longer-new-password' })
    expect(refused.status).toBe(401)
    expect(refused.body.error.code).toBe('INVALID_CREDENTIALS')

    await clearPasswordGate(REQUESTER_EMAIL)
    expect((await login(REQUESTER_EMAIL)).status).toBe(200)
  })
})

describe('API-08 · the new password is validated (AC-06, BR-05)', () => {
  it('refuses one shorter than the minimum and keeps the old one working', async () => {
    const cookie = await signIn(REQUESTER_EMAIL)

    const refused = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: DEVELOPMENT_PASSWORD, newPassword: 'short' })
    expect(refused.status).toBe(400)
    expect(refused.body.error.fieldErrors.map((f: any) => f.field)).toContain('newPassword')

    await clearPasswordGate(REQUESTER_EMAIL)
    expect((await login(REQUESTER_EMAIL)).status).toBe(200)
  })

  it('refuses a new password identical to the current one', async () => {
    const cookie = await signIn(REQUESTER_EMAIL)
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: DEVELOPMENT_PASSWORD, newPassword: DEVELOPMENT_PASSWORD })

    expect(response.status).toBe(400)
  })

  it('accepts one at the minimum length', async () => {
    const cookie = await signIn(REQUESTER_EMAIL)
    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', cookie)
      .send({ currentPassword: DEVELOPMENT_PASSWORD, newPassword: '0123456789' })

    expect(response.status).toBe(200)
  })
})

describe('API-09 · nothing secret leaves the server (AC-07, SEC-003)', () => {
  it('keeps hashes and tokens out of every authentication response', async () => {
    const cookie = await signIn(REQUESTER_EMAIL)

    const bodies = [
      (await login(REQUESTER_EMAIL)).body,
      (await login(REQUESTER_EMAIL, 'wrong')).body,
      (await request(app).get('/api/auth/me').set('Cookie', cookie)).body,
      (await request(app).post('/api/auth/logout').set('Cookie', cookie)).body,
    ]

    expect(bodies).toHaveLength(4)
    for (const body of bodies) {
      expect(JSON.stringify(body)).not.toMatch(SECRET_SHAPES)
    }
  })

  it('never puts the session token in the body', async () => {
    const result = await login(REQUESTER_EMAIL)
    expect(result.cookie).not.toBeNull()

    const token = result.cookie!.split('=')[1]
    expect(token.length).toBeGreaterThan(20)
    expect(JSON.stringify(result.body)).not.toContain(token)
  })
})

describe('API-10 · a password change ends the user’s other sessions (BR-07)', () => {
  it('refuses the other session and keeps the one that made the change', async () => {
    const first = await signIn(ADMIN_EMAIL)
    const second = (await login(ADMIN_EMAIL)).cookie ?? ''

    expect((await request(app).get('/api/auth/me').set('Cookie', first)).status).toBe(200)
    expect((await request(app).get('/api/auth/me').set('Cookie', second)).status).toBe(200)

    const changed = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', second)
      .send({ currentPassword: DEVELOPMENT_PASSWORD, newPassword: 'another-long-password' })
    expect(changed.status).toBe(200)

    expect((await request(app).get('/api/auth/me').set('Cookie', second)).status).toBe(200)
    expect((await request(app).get('/api/auth/me').set('Cookie', first)).status).toBe(401)
  })
})
