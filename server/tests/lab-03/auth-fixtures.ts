// The shared authenticated-request fixture (Issue #46). Every later Issue that
// needs a logged-in caller goes through here rather than repeating login.
import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import type { Response } from 'supertest'
import prisma from '../../src/prisma.js'
import app from '../../src/app.js'
import { errorHandler } from '../../src/http/errors.js'
import { hashPassword } from '../../src/auth/password.js'
import { SESSION_COOKIE } from '../../src/auth/session.js'
import {
  requireAuth,
  requirePasswordChanged,
} from '../../src/middleware/authContext.js'
import { requireOperation } from '../../src/middleware/authorize.js'
import { OPERATIONS } from '../../src/auth/matrix.js'
import { DEVELOPMENT_PASSWORD } from '../../src/seed/roster.js'

export const REQUESTER_EMAIL = 'jennifer.anderson@example.ac.th'
export const OTHER_REQUESTER_EMAIL = 'michael.brown@example.ac.th'
export const INACTIVE_REQUESTER_EMAIL = 'robert.wilson@example.ac.th'
export const STAFF_EMAIL = 'patricia.evans@example.ac.th'
export const INACTIVE_STAFF_EMAIL = 'thomas.fletcher@example.ac.th'
export const ADMIN_EMAIL = 'margaret.hale@example.ac.th'

export const UNKNOWN_EMAIL = 'nobody.here@example.ac.th'

export type LoginResult = {
  status: number
  body: unknown
  cookie: string | null
  setCookie: string[]
}

/** The Set-Cookie entry carrying the session, whole, ready for `.set('Cookie', …)`. */
export function sessionCookieFrom(response: Response): string | null {
  const raw = response.headers['set-cookie']
  const entries = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  const entry = entries.find((value) => value.startsWith(`${SESSION_COOKIE}=`))
  if (entry === undefined) return null
  const value = entry.split(';')[0]
  return value.endsWith('=') ? null : value
}

export async function login(
  email: string,
  password: string = DEVELOPMENT_PASSWORD,
): Promise<LoginResult> {
  const response = await request(app).post('/api/auth/login').send({ email, password })
  const raw = response.headers['set-cookie']
  return {
    status: response.status,
    body: response.body,
    cookie: sessionCookieFrom(response),
    setCookie: Array.isArray(raw) ? raw : raw === undefined ? [] : [raw],
  }
}

/** Seeded accounts all require a password change; this lifts the gate for setup. */
export async function clearPasswordGate(email: string): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: { mustChangePassword: false },
  })
}

/** A session cookie for a user who may use the application normally. */
export async function signIn(
  email: string,
  password: string = DEVELOPMENT_PASSWORD,
): Promise<string> {
  await clearPasswordGate(email)
  const { cookie } = await login(email, password)
  return cookie ?? ''
}

/** A session cookie for a user still behind the must-change gate. */
export async function signInUnready(
  email: string,
  password: string = DEVELOPMENT_PASSWORD,
): Promise<string> {
  await prisma.user.update({
    where: { email },
    data: { mustChangePassword: true },
  })
  const { cookie } = await login(email, password)
  return cookie ?? ''
}

/**
 * Put every account back to its seeded credential state. Tests that change a
 * password or lift the gate must call this, because the seed writes credentials
 * on create only and will not undo them.
 */
export async function restoreSeededCredentials(): Promise<void> {
  await prisma.session.deleteMany()
  await prisma.user.updateMany({
    data: { passwordHash: await hashPassword(DEVELOPMENT_PASSWORD), mustChangePassword: true },
  })
}

/**
 * One endpoint behind the real middleware chain. L3-3 owns the guards but not
 * yet any guarded route, so the boundary is proved by composing the real
 * middleware rather than by adding a route the product does not need.
 */
export function guardedApp() {
  const guarded = express()
  guarded.use(express.json())
  guarded.use(cookieParser())
  guarded.get('/guarded', requireAuth, requirePasswordChanged, (_req, res) => {
    res.json({ data: { reached: true } })
  })
  guarded.use(errorHandler)
  return guarded
}

/**
 * One route per operation in the matrix, behind the real middleware chain.
 * The refusal tests call these directly, never through a screen — the only way
 * to tell an enforced rule from a hidden button (security-contract.md §9).
 */
export function matrixApp() {
  const guarded = express()
  guarded.use(express.json())
  guarded.use(cookieParser())
  for (const operation of OPERATIONS) {
    guarded.get(
      `/ops/${operation}`,
      requireAuth,
      requirePasswordChanged,
      requireOperation(operation),
      (req, res) => {
        res.json({ data: { operation, grant: req.grant } })
      },
    )
  }
  guarded.use(errorHandler)
  return guarded
}
