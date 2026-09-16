// API-22…API-33, SEC-T07, SEC-T08. AC-28…AC-34; api-spec.md §9.
// The two safety refusals are the reason this Issue exists: a system that can
// be left with no active Administrator has locked everyone out permanently.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'
import { verifyPassword } from '../../src/auth/password.js'
import type { Role } from '../../src/auth/types.js'
import {
  ADMIN_EMAIL,
  REQUESTER_EMAIL,
  STAFF_EMAIL,
  restoreSeededCredentials,
  signIn,
} from './auth-fixtures.js'

const MADE_EMAIL_PREFIX = 'l3-admin-test'
const PASSWORD = 'an-initial-password'

const cookies: Record<Role, string> = {
  REQUESTER: '',
  IT_STAFF: '',
  ADMINISTRATOR: '',
}

let adminId = ''

const users = (cookie: string, query: Record<string, string> = {}) =>
  request(app).get('/api/admin/users').set('Cookie', cookie).query(query)

const createUser = (cookie: string, body: unknown) =>
  request(app).post('/api/admin/users').set('Cookie', cookie).send(body)

const patchUser = (cookie: string, id: string, body: unknown) =>
  request(app).patch(`/api/admin/users/${id}`).set('Cookie', cookie).send(body)

const setPassword = (cookie: string, id: string, body: unknown) =>
  request(app)
    .post(`/api/admin/users/${id}/initial-password`)
    .set('Cookie', cookie)
    .send(body)

function madeUser(suffix: string, overrides: Record<string, unknown> = {}) {
  return {
    displayName: `Test User ${suffix}`,
    email: `${MADE_EMAIL_PREFIX}-${suffix}@example.ac.th`,
    role: 'REQUESTER',
    initialPassword: PASSWORD,
    ...overrides,
  }
}

async function cleanUp(): Promise<void> {
  await prisma.user.deleteMany({
    where: { email: { startsWith: MADE_EMAIL_PREFIX } },
  })
}

beforeAll(async () => {
  cookies.REQUESTER = await signIn(REQUESTER_EMAIL)
  cookies.IT_STAFF = await signIn(STAFF_EMAIL)
  cookies.ADMINISTRATOR = await signIn(ADMIN_EMAIL)
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  })
  adminId = admin.id
}, 60_000)

afterEach(cleanUp)

afterAll(async () => {
  await cleanUp()
  await restoreSeededCredentials()
})

describe('API-25 · API-26 · AC-26 · AC-27 · the user list', () => {
  it('returns every user with the fields the screen shows', async () => {
    const response = await users(cookies.ADMINISTRATOR)

    expect(response.status).toBe(200)
    expect(response.body.data.length).toBeGreaterThanOrEqual(10)
    expect(Object.keys(response.body.data[0]).sort()).toEqual([
      'displayName',
      'email',
      'id',
      'isActive',
      'mustChangePassword',
      'role',
    ])
  })

  it('API-25 · never includes the password hash (SEC-003)', async () => {
    const response = await users(cookies.ADMINISTRATOR)

    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|\$2[aby]\$/)
  })

  it('orders by display name', async () => {
    const names = (await users(cookies.ADMINISTRATOR)).body.data.map(
      (user: { displayName: string }) => user.displayName,
    )
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('searches name and email, case-insensitively', async () => {
    const byName = await users(cookies.ADMINISTRATOR, { search: 'jennifer' })
    expect(byName.body.data).toHaveLength(1)
    expect(byName.body.data[0].displayName).toBe('Jennifer Anderson')

    const byEmail = await users(cookies.ADMINISTRATOR, { search: 'PATRICIA.EVANS@' })
    expect(byEmail.body.data).toHaveLength(1)
    expect(byEmail.body.data[0].email).toBe(STAFF_EMAIL)
  })

  it('filters by role, and includes inactive users', async () => {
    const staff = await users(cookies.ADMINISTRATOR, { role: 'IT_STAFF' })

    expect(staff.body.data).toHaveLength(4)
    expect(staff.body.data.some((user: { isActive: boolean }) => !user.isActive)).toBe(true)
  })

  it('refuses an unknown role and an unaccepted parameter', async () => {
    expect((await users(cookies.ADMINISTRATOR, { role: 'SUPERUSER' })).status).toBe(400)
    expect((await users(cookies.ADMINISTRATOR, { page: '2' })).status).toBe(400)
  })
})

describe('API-27 · AC-28 · creating a user', () => {
  it('creates one that must change its password (BR-06, SEC-011)', async () => {
    const response = await createUser(cookies.ADMINISTRATOR, madeUser('create'))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      displayName: 'Test User create',
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: true,
    })
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD)
  })

  it('stores the initial password as a hash that works', async () => {
    await createUser(cookies.ADMINISTRATOR, madeUser('hash'))

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: `${MADE_EMAIL_PREFIX}-hash@example.ac.th` },
      select: { passwordHash: true },
    })
    expect(stored.passwordHash).not.toBe(PASSWORD)
    expect(await verifyPassword(PASSWORD, stored.passwordHash)).toBe(true)
  })

  it('API-28 · AC-29 · refuses a duplicate email, compared case-insensitively (BR-33)', async () => {
    expect((await createUser(cookies.ADMINISTRATOR, madeUser('dupe'))).status).toBe(201)

    const response = await createUser(
      cookies.ADMINISTRATOR,
      madeUser('dupe', { email: `${MADE_EMAIL_PREFIX}-DUPE@EXAMPLE.AC.TH` }),
    )

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS')
    // The message names the field and nothing about the other account (SEC-036).
    expect(JSON.stringify(response.body)).not.toContain('Test User dupe')
  })

  it('API-29 · AC-30 · refuses an unknown role rather than defaulting (BR-34, SEC-037)', async () => {
    for (const role of ['SUPERUSER', 'requester', '', 42, null]) {
      const response = await createUser(cookies.ADMINISTRATOR, madeUser('role', { role }))
      expect(response.status, String(role)).toBe(400)
    }
  })

  it('refuses an initial password below the minimum', async () => {
    const response = await createUser(
      cookies.ADMINISTRATOR,
      madeUser('short', { initialPassword: 'short' }),
    )
    expect(response.status).toBe(400)
  })

  it('refuses a missing field and an unaccepted one', async () => {
    const { email: _email, ...withoutEmail } = madeUser('missing')
    expect((await createUser(cookies.ADMINISTRATOR, withoutEmail)).status).toBe(400)

    const response = await createUser(
      cookies.ADMINISTRATOR,
      madeUser('extra', { mustChangePassword: false }),
    )
    expect(response.status).toBe(400)
  })
})

describe('FR-31 · editing a user', () => {
  async function make(suffix: string, overrides: Record<string, unknown> = {}) {
    const response = await createUser(cookies.ADMINISTRATOR, madeUser(suffix, overrides))
    expect(response.status).toBe(201)
    return response.body.data.id as string
  }

  it('changes name, email, role, and activation state', async () => {
    const id = await make('edit')
    const response = await patchUser(cookies.ADMINISTRATOR, id, {
      displayName: 'Renamed User',
      email: `${MADE_EMAIL_PREFIX}-renamed@example.ac.th`,
      role: 'IT_STAFF',
      isActive: false,
    })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      displayName: 'Renamed User',
      email: `${MADE_EMAIL_PREFIX}-renamed@example.ac.th`,
      role: 'IT_STAFF',
      isActive: false,
    })
  })

  it('keeps one role per user (BR-11)', async () => {
    const id = await make('one-role')
    await patchUser(cookies.ADMINISTRATOR, id, { role: 'IT_STAFF' })
    const response = await patchUser(cookies.ADMINISTRATOR, id, { role: 'ADMINISTRATOR' })

    expect(response.body.data.role).toBe('ADMINISTRATOR')
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { role: true },
    })
    expect(stored.role).toBe('ADMINISTRATOR')
  })

  it('API-33 · BR-38 · deactivation leaves their Tickets untouched', async () => {
    // Its own user, not the shared seeded Requester: deactivating that one
    // deletes the session every later test in this file is holding.
    const id = await make('keeps-tickets')
    const [category, relatedSystem] = await Promise.all([
      prisma.category.findFirstOrThrow({ select: { id: true } }),
      prisma.relatedSystem.findFirstOrThrow({ select: { id: true } }),
    ])
    await prisma.ticket.create({
      data: {
        ticketNo: 'TKT-2026-950001',
        requesterId: id,
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: 'Survives deactivation',
        description: 'Created by users-admin.api.test.ts.',
        requestedPriority: 'LOW',
        itPriority: 'LOW',
      },
    })

    expect((await patchUser(cookies.ADMINISTRATOR, id, { isActive: false })).status).toBe(200)

    const kept = await prisma.ticket.findUnique({
      where: { ticketNo: 'TKT-2026-950001' },
      select: { requesterId: true },
    })
    expect(kept?.requesterId).toBe(id)

    await prisma.ticket.deleteMany({ where: { ticketNo: 'TKT-2026-950001' } })
  })

  it('BR-39 · deactivation ends that user’s sessions', async () => {
    const id = await make('loses-session')
    const cookie = await signIn(`${MADE_EMAIL_PREFIX}-loses-session@example.ac.th`, PASSWORD)

    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(200)

    await patchUser(cookies.ADMINISTRATOR, id, { isActive: false })

    expect(await prisma.session.count({ where: { userId: id } })).toBe(0)
    // Deactivation takes effect on the next request, not when the session
    // happens to expire.
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401)
  })

  it('refuses a duplicate email on edit', async () => {
    const id = await make('edit-dupe')
    const response = await patchUser(cookies.ADMINISTRATOR, id, {
      email: ADMIN_EMAIL.toUpperCase(),
    })

    expect(response.status).toBe(409)
  })

  it('lets a user keep their own email', async () => {
    const id = await make('same-email')
    const response = await patchUser(cookies.ADMINISTRATOR, id, {
      email: `${MADE_EMAIL_PREFIX}-same-email@example.ac.th`,
      displayName: 'Still Fine',
    })

    expect(response.status).toBe(200)
  })

  it('refuses an empty change and an unknown user', async () => {
    const id = await make('empty')
    expect((await patchUser(cookies.ADMINISTRATOR, id, {})).status).toBe(400)
    expect(
      (await patchUser(cookies.ADMINISTRATOR, '00000000-0000-4000-8000-000000000000', {
        displayName: 'Nobody',
      })).status,
    ).toBe(404)
  })
})

describe('API-30 · API-31 · AC-31 · AC-32 · the two safety refusals', () => {
  // Every test here restores the seeded Administrator through Prisma rather
  // than the API: a caller who has just demoted themselves no longer holds
  // user:write, so the API cannot undo what it was told to do.
  afterEach(async () => {
    await prisma.user.update({
      where: { id: adminId },
      data: { role: 'ADMINISTRATOR', isActive: true },
    })
  })

  it('refuses an Administrator deactivating their own account (BR-35, SEC-034)', async () => {
    const response = await patchUser(cookies.ADMINISTRATOR, adminId, { isActive: false })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('CANNOT_DEACTIVATE_SELF')

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: adminId },
      select: { isActive: true },
    })
    expect(stored.isActive).toBe(true)
  })

  it('lets the same Administrator change other things about themselves', async () => {
    const response = await patchUser(cookies.ADMINISTRATOR, adminId, {
      displayName: 'Margaret Hale',
    })
    expect(response.status).toBe(200)
  })

  it('refuses the last active Administrator demoting themselves (BR-36, SEC-035)', async () => {
    // The seeded Administrator is the only active one.
    expect(
      await prisma.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } }),
    ).toBe(1)

    const response = await patchUser(cookies.ADMINISTRATOR, adminId, { role: 'IT_STAFF' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('LAST_ADMINISTRATOR')

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: adminId },
      select: { role: true },
    })
    expect(stored.role).toBe('ADMINISTRATOR')
  })

  it('allows the same change once another active Administrator exists', async () => {
    const spare = await createUser(
      cookies.ADMINISTRATOR,
      madeUser('spare-admin', { role: 'ADMINISTRATOR' }),
    )
    expect(spare.status).toBe(201)

    const response = await patchUser(cookies.ADMINISTRATOR, adminId, { role: 'IT_STAFF' })
    expect(response.status).toBe(200)
  })

  it('refuses demoting an only-active-Administrator who is not the caller', async () => {
    // Two Administrators, so the caller can act on the other one.
    const spare = await createUser(
      cookies.ADMINISTRATOR,
      madeUser('other-admin', { role: 'ADMINISTRATOR' }),
    )
    const spareId = spare.body.data.id as string
    const spareCookie = await signIn(
      `${MADE_EMAIL_PREFIX}-other-admin@example.ac.th`,
      PASSWORD,
    )

    // The spare demotes the seeded Administrator: allowed, two exist.
    expect((await patchUser(spareCookie, adminId, { role: 'IT_STAFF' })).status).toBe(200)

    // Now the spare is the only one, and demoting itself is refused.
    const response = await patchUser(spareCookie, spareId, { role: 'IT_STAFF' })
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('LAST_ADMINISTRATOR')
  })

  it('leaves at least one active Administrator standing, whatever is attempted', async () => {
    await patchUser(cookies.ADMINISTRATOR, adminId, { isActive: false })
    await patchUser(cookies.ADMINISTRATOR, adminId, { role: 'REQUESTER' })

    // The property both rules exist to protect.
    expect(
      await prisma.user.count({ where: { role: 'ADMINISTRATOR', isActive: true } }),
    ).toBeGreaterThan(0)
  })
})

describe('API-32 · AC-33 · setting an initial password', () => {
  it('sets the hash, sets the gate, and never echoes the password', async () => {
    const created = await createUser(cookies.ADMINISTRATOR, madeUser('reset'))
    const id = created.body.data.id
    await prisma.user.update({ where: { id }, data: { mustChangePassword: false } })

    const response = await setPassword(cookies.ADMINISTRATOR, id, {
      initialPassword: 'a-brand-new-password',
    })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ id, mustChangePassword: true })
    expect(JSON.stringify(response.body)).not.toContain('a-brand-new-password')

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { passwordHash: true },
    })
    expect(await verifyPassword('a-brand-new-password', stored.passwordHash)).toBe(true)
  })

  it('ends that user’s sessions', async () => {
    const created = await createUser(cookies.ADMINISTRATOR, madeUser('reset-sessions'))
    const id = created.body.data.id
    await prisma.session.create({
      data: { id: 'test-session-token-for-reset', userId: id, expiresAt: new Date(Date.now() + 60_000) },
    })

    await setPassword(cookies.ADMINISTRATOR, id, { initialPassword: 'another-new-password' })

    expect(await prisma.session.count({ where: { userId: id } })).toBe(0)
  })

  it('refuses one below the minimum, and an unknown user', async () => {
    const created = await createUser(cookies.ADMINISTRATOR, madeUser('reset-short'))
    expect(
      (await setPassword(cookies.ADMINISTRATOR, created.body.data.id, {
        initialPassword: 'short',
      })).status,
    ).toBe(400)

    expect(
      (await setPassword(cookies.ADMINISTRATOR, '00000000-0000-4000-8000-000000000000', {
        initialPassword: 'a-valid-password',
      })).status,
    ).toBe(404)
  })
})

describe('SEC-T07 · SEC-T08 · AC-10 · AC-11 · nobody else reaches these', () => {
  const ROUTES: Array<[string, 'get' | 'post' | 'patch', string]> = [
    ['list', 'get', '/api/admin/users'],
    ['create', 'post', '/api/admin/users'],
    ['update', 'patch', '/api/admin/users/00000000-0000-4000-8000-000000000000'],
    [
      'initial password',
      'post',
      '/api/admin/users/00000000-0000-4000-8000-000000000000/initial-password',
    ],
  ]

  for (const role of ['REQUESTER', 'IT_STAFF'] as Role[]) {
    it(`refuses ${role} on every administrator route`, async () => {
      // The positive control: the Administrator does reach them.
      expect((await users(cookies.ADMINISTRATOR)).status).toBe(200)

      for (const [name, method, path] of ROUTES) {
        const response = await request(app)[method](path)
          .set('Cookie', cookies[role])
          .send({})
        expect(response.status, `${role} ${name}`).toBe(403)
        expect(response.body.error.code).toBe('FORBIDDEN')
        expect(response.body).not.toHaveProperty('data')
      }
    })
  }

  it('refuses an unauthenticated caller with 401', async () => {
    for (const [name, method, path] of ROUTES) {
      const response = await request(app)[method](path).send({})
      expect(response.status, name).toBe(401)
    }
  })

  it('leaks no user data in any refusal', async () => {
    const response = await users(cookies.IT_STAFF)
    expect(JSON.stringify(response.body)).not.toContain('Jennifer Anderson')
  })
})
