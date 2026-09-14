// Administrator user management (api-spec.md §9).
//
// The two safety rules — no self-deactivation, never zero active
// Administrators — are evaluated inside the update transaction at Serializable
// isolation. Checking before the transaction admits a race where two
// Administrators deactivate each other at once and the count reads correctly
// for each of them individually.
import { type PrismaClient } from '../generated/prisma/client.js'
import { ApiError, type FieldError } from '../http/errors.js'
import { logSecurityEvent } from '../http/securityLog.js'
import { hashPassword } from '../auth/password.js'
import { MIN_PASSWORD_LENGTH } from '../auth/policy.js'
import { UUID } from '../tickets/validation.js'
import type { Role } from '../auth/types.js'

export const ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

/** Never the hash (SEC-003). */
const SAFE_USER_SELECT = {
  id: true,
  displayName: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
} as const

const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 254

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validationFailed(fieldErrors: FieldError[]): ApiError {
  return new ApiError(400, 'VALIDATION_FAILED', 'The request was not accepted.', fieldErrors)
}

/** Compared case-insensitively (BR-33), so it is stored that way too. */
function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldInput = {
  displayName?: string
  email?: string
  role?: Role
  isActive?: boolean
  initialPassword?: string
}

function readFields(
  body: unknown,
  allowed: (keyof FieldInput)[],
  required: (keyof FieldInput)[],
): { value: FieldInput; errors: FieldError[] } {
  const value: FieldInput = {}
  const errors: FieldError[] = []

  if (!isRecord(body)) {
    return { value, errors: [{ field: 'body', message: 'Send a JSON object.' }] }
  }

  for (const key of Object.keys(body)) {
    if (!(allowed as string[]).includes(key)) {
      errors.push({ field: key, message: 'This field is not accepted.' })
    }
  }

  if ('displayName' in body) {
    const raw = body.displayName
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      errors.push({ field: 'displayName', message: 'Enter a name.' })
    } else if (raw.trim().length > MAX_NAME_LENGTH) {
      errors.push({
        field: 'displayName',
        message: `Keep the name to ${MAX_NAME_LENGTH} characters or fewer.`,
      })
    } else {
      value.displayName = raw.trim()
    }
  }

  if ('email' in body) {
    const raw = body.email
    if (typeof raw !== 'string' || !EMAIL_PATTERN.test(raw.trim())) {
      errors.push({ field: 'email', message: 'Enter a valid email address.' })
    } else if (raw.trim().length > MAX_EMAIL_LENGTH) {
      errors.push({ field: 'email', message: 'That email address is too long.' })
    } else {
      value.email = normalizeEmail(raw)
    }
  }

  if ('role' in body) {
    const raw = body.role
    // An unknown role is a validation failure, never a silent default (BR-34).
    if (typeof raw !== 'string' || !ROLES.includes(raw as Role)) {
      errors.push({
        field: 'role',
        message: 'Choose Requester, IT Staff, or Administrator.',
      })
    } else {
      value.role = raw as Role
    }
  }

  if ('isActive' in body) {
    const raw = body.isActive
    if (typeof raw !== 'boolean') {
      errors.push({ field: 'isActive', message: 'Choose active or inactive.' })
    } else {
      value.isActive = raw
    }
  }

  if ('initialPassword' in body) {
    const raw = body.initialPassword
    if (typeof raw !== 'string' || raw.length < MIN_PASSWORD_LENGTH) {
      errors.push({
        field: 'initialPassword',
        message: `The initial password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      })
    } else {
      value.initialPassword = raw
    }
  }

  for (const key of required) {
    if (value[key] === undefined && !errors.some((error) => error.field === key)) {
      errors.push({ field: key, message: 'This field is required.' })
    }
  }

  return { value, errors }
}

/** The message names the field and nothing about the existing account (SEC-036). */
function emailConflict(): ApiError {
  return new ApiError(
    409,
    'EMAIL_ALREADY_EXISTS',
    'That email address is already in use.',
    [{ field: 'email', message: 'Choose a different email address.' }],
  )
}

function userNotFound(): ApiError {
  return new ApiError(404, 'USER_NOT_FOUND', 'User not found.')
}

export async function listUsers(rawQuery: unknown, db: PrismaClient) {
  const query = isRecord(rawQuery) ? rawQuery : {}
  const errors: FieldError[] = []

  for (const key of Object.keys(query)) {
    if (!['search', 'role'].includes(key)) {
      errors.push({ field: key, message: 'This query parameter is not accepted.' })
    }
  }

  let search: string | null = null
  if (query.search !== undefined) {
    const raw = query.search
    const trimmed = typeof raw === 'string' ? raw.trim() : ''
    if (typeof raw !== 'string' || trimmed.length < 1 || trimmed.length > 150) {
      errors.push({
        field: 'search',
        message: 'Search must be between 1 and 150 characters.',
      })
    } else {
      search = trimmed
    }
  }

  let role: Role | null = null
  if (query.role !== undefined) {
    const raw = query.role
    if (typeof raw !== 'string' || !ROLES.includes(raw as Role)) {
      errors.push({ field: 'role', message: 'Choose a valid role.' })
    } else {
      role = raw as Role
    }
  }

  if (errors.length > 0) throw validationFailed(errors)

  return db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: SAFE_USER_SELECT,
    orderBy: { displayName: 'asc' },
  })
}

export async function createUser(body: unknown, db: PrismaClient) {
  const { value, errors } = readFields(
    body,
    ['displayName', 'email', 'role', 'isActive', 'initialPassword'],
    ['displayName', 'email', 'role', 'initialPassword'],
  )
  if (errors.length > 0) throw validationFailed(errors)

  const existing = await db.user.findUnique({
    where: { email: value.email! },
    select: { id: true },
  })
  if (existing) throw emailConflict()

  return db.user.create({
    data: {
      displayName: value.displayName!,
      email: value.email!,
      role: value.role!,
      isActive: value.isActive ?? true,
      passwordHash: await hashPassword(value.initialPassword!),
      // An initial password is a bridge, never a durable credential (BR-06).
      mustChangePassword: true,
    },
    select: SAFE_USER_SELECT,
  })
}

export async function updateUser(
  userId: string,
  callerId: string,
  body: unknown,
  db: PrismaClient,
) {
  if (!UUID.test(userId)) throw userNotFound()

  const { value, errors } = readFields(
    body,
    ['displayName', 'email', 'role', 'isActive'],
    [],
  )
  if (errors.length > 0) throw validationFailed(errors)
  if (Object.keys(value).length === 0) {
    throw validationFailed([{ field: 'body', message: 'Change at least one field.' }])
  }

  // An Administrator cannot deactivate their own account (BR-35). Checked
  // before the transaction as well because it needs no count to decide.
  if (value.isActive === false && userId === callerId) {
    logSecurityEvent('SELF_DEACTIVATION_REFUSED', { userId })
    throw new ApiError(
      403,
      'CANNOT_DEACTIVATE_SELF',
      'You cannot deactivate your own account.',
    )
  }

  return db.$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true },
      })
      if (!target) throw userNotFound()

      if (value.email) {
        const clash = await tx.user.findFirst({
          where: { email: value.email, id: { not: userId } },
          select: { id: true },
        })
        if (clash) throw emailConflict()
      }

      // BR-36: the system can never be left with zero active Administrators.
      // Deactivating and demoting are the same risk, so both are checked here.
      const losesAdministrator =
        target.role === 'ADMINISTRATOR' &&
        target.isActive &&
        (value.isActive === false ||
          (value.role !== undefined && value.role !== 'ADMINISTRATOR'))

      if (losesAdministrator) {
        const remaining = await tx.user.count({
          where: { role: 'ADMINISTRATOR', isActive: true, id: { not: userId } },
        })
        if (remaining === 0) {
          logSecurityEvent('LAST_ADMINISTRATOR_REFUSED', { userId })
          throw new ApiError(
            409,
            'LAST_ADMINISTRATOR',
            'This is the only active Administrator, so it cannot be deactivated or changed to another role.',
          )
        }
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: value,
        select: SAFE_USER_SELECT,
      })

      // A deactivated user's existing sessions are invalidated: otherwise
      // deactivation does not take effect until the session expires (BR-39).
      // Tickets they own or submitted are untouched (BR-38).
      if (value.isActive === false) {
        await tx.session.deleteMany({ where: { userId } })
      }

      return updated
    },
    // Counting inside a Read Committed transaction still lets two concurrent
    // deactivations each see one other Administrator. Serializable makes one
    // of them fail rather than both succeed.
    { isolationLevel: 'Serializable' },
  )
}

export async function setInitialPassword(
  userId: string,
  body: unknown,
  db: PrismaClient,
) {
  if (!UUID.test(userId)) throw userNotFound()

  const { value, errors } = readFields(body, ['initialPassword'], ['initialPassword'])
  if (errors.length > 0) throw validationFailed(errors)

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!target) throw userNotFound()

  const passwordHash = await hashPassword(value.initialPassword!)
  const [updated] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
      select: { id: true, mustChangePassword: true },
    }),
    // Whatever sessions that password replaced are no longer theirs to keep.
    db.session.deleteMany({ where: { userId } }),
  ])

  // The password is never echoed: the Administrator already knows what they
  // typed, and a response that repeats it puts it in a log (SEC-032).
  return updated
}
