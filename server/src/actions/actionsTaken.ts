// Actions Taken on a Ticket (lab-04 api-spec.md §3). Authority: specification.md §5.
//
// Every write runs in one transaction that first locks the Ticket row (BR-33), so it serialises with any
// other write on the same Ticket, checks its state, changes the Action, touches the Ticket and appends its
// event. Identity comes from the session; none of the server-owned fields is read from the body (BR-05).
import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { ApiError, type FieldError } from '../http/errors.js'
import type { Scope } from '../auth/matrix.js'
import type { Role } from '../auth/types.js'
import { UUID } from '../tickets/validation.js'
import { CREATION_ORDER } from '../tickets/workflowRules.js'
import {
  actionAssignedPayload,
  actionCreatedPayload,
  actionMovedPayload,
  actionUpdatedPayload,
  appendEvents,
  type Tx,
} from './events.js'
import {
  ATTACHMENT_NOTES_MAX,
  DESCRIPTION_MAX,
  REASON_MAX,
  TEXT_MAX,
  effectiveResult,
  judgeMove,
  permittedMoves,
  readText,
  resolveFollowUp,
  type ActionStatus,
} from './rules.js'

const ASSIGNEE_ROLES: Role[] = ['IT_STAFF', 'ADMINISTRATOR']
const WORKING_STATUSES = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED']

const PERSON = { select: { id: true, displayName: true, isActive: true } } as const
const INCLUDE = {
  assignee: PERSON,
  performedBy: PERSON,
  completedBy: PERSON,
  cancelledBy: PERSON,
} as const

type ActionRow = Prisma.ActionTakenGetPayload<{ include: typeof INCLUDE }>

const ticketNotFound = () => new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.')
const actionNotFound = () => new ApiError(404, 'ACTION_NOT_FOUND', 'Action not found.')

function validationFailed(fieldErrors: FieldError[]): ApiError {
  return new ApiError(400, 'VALIDATION_FAILED', 'The request was not accepted.', fieldErrors)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Only the keys named; anything else, server-owned fields included, is a failure and never ignored (BR-05). */
function readBody(body: unknown, allowed: readonly string[]): { data: Record<string, unknown>; errors: FieldError[] } {
  if (!isRecord(body)) return { data: {}, errors: [{ field: 'body', message: 'Send a JSON object.' }] }
  const errors = Object.keys(body)
    .filter((key) => !allowed.includes(key))
    .map((field) => ({ field, message: 'This field is not accepted.' }))
  return { data: body, errors }
}

function readUuid(raw: unknown, field: string, message: string): { value: string | null; errors: FieldError[] } {
  if (typeof raw === 'string' && UUID.test(raw)) return { value: raw, errors: [] }
  return { value: null, errors: [{ field, message }] }
}

function readExpectedVersion(raw: unknown): { value: number; errors: FieldError[] } {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) return { value: raw, errors: [] }
  return { value: 0, errors: [{ field: 'expectedVersion', message: 'Send the version you last saw, a whole number from 1.' }] }
}

/** Staff see identifiers and activity; a Requester sees names only (BR-17). */
function view(a: ActionRow, forStaff: boolean) {
  const named = (p: { id: string; displayName: string } | null) =>
    p === null ? null : forStaff ? { id: p.id, displayName: p.displayName } : { displayName: p.displayName }

  return {
    id: a.id,
    ticketId: a.ticketId,
    status: a.status,
    description: a.description,
    result: a.result,
    followUpRequired: a.followUpRequired,
    followUpNote: a.followUpNote,
    attachmentNotes: a.attachmentNotes,
    assignee: forStaff
      ? { id: a.assignee.id, displayName: a.assignee.displayName, isActive: a.assignee.isActive }
      : { displayName: a.assignee.displayName },
    performedBy: named(a.performedBy),
    actionAt: a.createdAt,
    completedBy: named(a.completedBy),
    completedAt: a.completedAt,
    cancelledBy: named(a.cancelledBy),
    cancelledAt: a.cancelledAt,
    cancellationReason: a.cancellationReason,
    version: a.version,
    updatedAt: a.updatedAt,
  }
}

/** Takes the Ticket row lock and returns its status, or a 404 (BR-33). */
async function lockTicket(tx: Tx, ticketId: string): Promise<string> {
  const rows = await tx.$queryRaw<{ status: string }[]>`
    SELECT "status"::text AS "status" FROM "Ticket" WHERE "id" = ${ticketId}::uuid FOR UPDATE`
  if (rows.length === 0) throw ticketNotFound()
  return rows[0].status
}

function requireWorking(ticketStatus: string): void {
  if (!WORKING_STATUSES.includes(ticketStatus)) {
    throw new ApiError(409, 'TICKET_NOT_WORKABLE', 'This Ticket is no longer open for Actions. Reopen it to record more work.', [], { ticketStatus })
  }
}

async function requireEligibleAssignee(tx: Tx, assigneeId: string): Promise<void> {
  const user = await tx.user.findUnique({ where: { id: assigneeId }, select: { role: true, isActive: true } })
  if (!user || !user.isActive || !ASSIGNEE_ROLES.includes(user.role)) {
    throw new ApiError(400, 'ASSIGNEE_NOT_ELIGIBLE', 'An Action must be assigned to an active IT Staff or Administrator user.', [
      { field: 'assigneeId', message: 'Choose an active IT Staff or Administrator.' },
    ])
  }
}

async function loadAction(tx: Tx, ticketId: string, actionId: string): Promise<ActionRow> {
  const action = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, include: INCLUDE })
  if (!action) throw actionNotFound()
  return action
}

/** Version first, then finality, then the Ticket's window (BR-31, BR-10, BR-23). */
function requireCurrent(action: ActionRow, expectedVersion: number, ticketStatus: string): void {
  if (action.version !== expectedVersion) {
    throw new ApiError(409, 'STALE_VERSION', 'This Action was changed by someone else. Review the latest version and try again.', [], {
      currentVersion: action.version,
      current: view(action, true),
    })
  }
  if (action.status === 'COMPLETED' || action.status === 'CANCELLED') {
    throw new ApiError(409, 'ACTION_TERMINAL', 'This Action is already completed or cancelled.')
  }
  requireWorking(ticketStatus)
}

/** Moves the Ticket's updatedAt to `now`, but never back past what an earlier change set (BR-35). */
async function touchTicket(tx: Tx, ticketId: string, now: Date): Promise<void> {
  await tx.$executeRaw`UPDATE "Ticket" SET "updatedAt" = GREATEST("updatedAt", ${now}::timestamptz) WHERE "id" = ${ticketId}::uuid`
}

export async function listActions(ticketId: string, callerId: string, grant: Scope, db: PrismaClient) {
  const ticket = await db.ticket.findFirst({
    where: grant === 'own' ? { id: ticketId, requesterId: callerId } : { id: ticketId },
    select: { id: true },
  })
  if (!ticket) throw ticketNotFound()

  const rows = await db.actionTaken.findMany({
    where: { ticketId },
    include: INCLUDE,
    orderBy: [...CREATION_ORDER],
  })
  return rows.map((row) => view(row, grant !== 'own'))
}

const CREATE_FIELDS = ['requestId', 'description', 'assigneeId', 'followUpRequired', 'followUpNote', 'attachmentNotes']

export async function createAction(ticketId: string, callerId: string, body: unknown, now: Date, db: PrismaClient) {
  const { data, errors } = readBody(body, CREATE_FIELDS)
  const requestId = readUuid(data.requestId, 'requestId', 'Send a request identifier (a UUID).')
  const assignee = readUuid(data.assigneeId, 'assigneeId', 'Choose an assignee.')
  const description = readText(data.description, 'description', { required: true, min: 1, max: DESCRIPTION_MAX })
  const attachmentNotes = readText(data.attachmentNotes, 'attachmentNotes', { required: false, min: 0, max: ATTACHMENT_NOTES_MAX })
  const followUp = resolveFollowUp(
    { followUpRequired: false, followUpNote: null },
    { followUpRequired: data.followUpRequired, followUpNote: data.followUpNote },
  )
  const all = [...errors, ...requestId.errors, ...assignee.errors, ...description.errors, ...attachmentNotes.errors, ...followUp.errors]
  if (all.length > 0) throw validationFailed(all)

  return db.$transaction(async (tx) => {
    requireWorking(await lockTicket(tx, ticketId))

    // A retry carries the same request identifier and gets the Action it already made (BR-34).
    const existing = await tx.actionTaken.findUnique({
      where: { ticketId_requestId: { ticketId, requestId: requestId.value! } },
      include: INCLUDE,
    })
    if (existing) return { created: false, action: view(existing, true) }

    await requireEligibleAssignee(tx, assignee.value!)
    const created = await tx.actionTaken.create({
      data: {
        ticketId,
        requestId: requestId.value!,
        description: description.value!,
        assigneeId: assignee.value!,
        performedById: callerId,
        followUpRequired: followUp.followUpRequired,
        followUpNote: followUp.followUpNote,
        attachmentNotes: attachmentNotes.value,
      },
      include: INCLUDE,
    })
    await touchTicket(tx, ticketId, now)
    await appendEvents(tx, now, [
      {
        ticketId,
        actionId: created.id,
        actorId: callerId,
        type: 'ACTION_CREATED',
        payload: actionCreatedPayload({ assigneeId: created.assigneeId }),
      },
    ])
    return { created: true, action: view(created, true) }
  })
}

const EDITABLE = ['description', 'result', 'followUpRequired', 'followUpNote', 'attachmentNotes', 'assigneeId']

export async function updateAction(
  ticketId: string,
  actionId: string,
  callerId: string,
  body: unknown,
  now: Date,
  db: PrismaClient,
) {
  const { data, errors } = readBody(body, ['expectedVersion', ...EDITABLE])
  const version = readExpectedVersion(data.expectedVersion)
  const supplied = EDITABLE.filter((key) => data[key] !== undefined)
  const all = [...errors, ...version.errors]
  if (supplied.length === 0 && errors.length === 0) {
    all.push({ field: 'body', message: 'Send at least one field to change.' })
  }
  const description = supplied.includes('description')
    ? readText(data.description, 'description', { required: true, min: 1, max: DESCRIPTION_MAX })
    : null
  const result = supplied.includes('result') ? readText(data.result, 'result', { required: false, min: 0, max: TEXT_MAX }) : null
  const notes = supplied.includes('attachmentNotes')
    ? readText(data.attachmentNotes, 'attachmentNotes', { required: false, min: 0, max: ATTACHMENT_NOTES_MAX })
    : null
  const assignee = supplied.includes('assigneeId') ? readUuid(data.assigneeId, 'assigneeId', 'Choose an assignee.') : null
  for (const check of [description, result, notes, assignee]) if (check) all.push(...check.errors)
  if (all.length > 0) throw validationFailed(all)

  return db.$transaction(async (tx) => {
    const ticketStatus = await lockTicket(tx, ticketId)
    const current = await loadAction(tx, ticketId, actionId)
    requireCurrent(current, version.value, ticketStatus)

    const followUp = resolveFollowUp(
      { followUpRequired: current.followUpRequired, followUpNote: current.followUpNote },
      { followUpRequired: data.followUpRequired, followUpNote: data.followUpNote },
    )
    if (followUp.errors.length > 0) throw validationFailed(followUp.errors)

    const changes: Record<string, string | boolean | null> = {}
    const changedFields: string[] = []
    const consider = (field: string, next: string | boolean | null, previous: string | boolean | null) => {
      if (next !== previous) {
        changes[field] = next
        changedFields.push(field)
      }
    }
    if (description) consider('description', description.value, current.description)
    if (result) consider('result', result.value, current.result)
    if (notes) consider('attachmentNotes', notes.value, current.attachmentNotes)
    consider('followUpRequired', followUp.followUpRequired, current.followUpRequired)
    consider('followUpNote', followUp.followUpNote, current.followUpNote)

    const reassigned = assignee !== null && assignee.value !== current.assigneeId
    if (reassigned) {
      await requireEligibleAssignee(tx, assignee.value!)
      changes.assigneeId = assignee.value
    }
    // Nothing differs: no new version, no event (BR-31 counts changes).
    if (changedFields.length === 0 && !reassigned) return view(current, true)

    const updated = await tx.actionTaken.update({
      where: { id: actionId },
      data: { ...(changes as Prisma.ActionTakenUncheckedUpdateInput), version: { increment: 1 } },
      include: INCLUDE,
    })
    await touchTicket(tx, ticketId, now)
    await appendEvents(tx, now, [
      ...(changedFields.length > 0
        ? [{ ticketId, actionId, actorId: callerId, type: 'ACTION_UPDATED' as const, payload: actionUpdatedPayload(changedFields) }]
        : []),
      ...(reassigned
        ? [
            {
              ticketId,
              actionId,
              actorId: callerId,
              type: 'ACTION_ASSIGNED' as const,
              payload: actionAssignedPayload({ fromAssigneeId: current.assigneeId, toAssigneeId: updated.assigneeId }),
            },
          ]
        : []),
    ])
    return view(updated, true)
  })
}

const TRANSITION_EVENT = {
  IN_PROGRESS: 'ACTION_STARTED',
  COMPLETED: 'ACTION_COMPLETED',
  CANCELLED: 'ACTION_CANCELLED',
} as const

export async function transitionAction(
  ticketId: string,
  actionId: string,
  callerId: string,
  body: unknown,
  now: Date,
  db: PrismaClient,
) {
  const { data, errors } = readBody(body, ['expectedVersion', 'status', 'result', 'cancellationReason'])
  const version = readExpectedVersion(data.expectedVersion)
  const all = [...errors, ...version.errors]

  const status = data.status
  const knownStatuses: readonly string[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  if (typeof status !== 'string' || !knownStatuses.includes(status)) {
    all.push({ field: 'status', message: 'Choose PLANNED, IN_PROGRESS, COMPLETED or CANCELLED.' })
  }
  // Each target takes only its own extra field (BR-11, BR-12).
  if (status !== 'COMPLETED' && data.result !== undefined) {
    all.push({ field: 'result', message: 'A Result is only sent when completing an Action.' })
  }
  if (status !== 'CANCELLED' && data.cancellationReason !== undefined) {
    all.push({ field: 'cancellationReason', message: 'A reason is only sent when cancelling an Action.' })
  }
  const reason =
    status === 'CANCELLED'
      ? readText(data.cancellationReason, 'cancellationReason', { required: true, min: 1, max: REASON_MAX })
      : null
  if (reason) all.push(...reason.errors)
  if (all.length > 0) throw validationFailed(all)

  const target = status as ActionStatus
  return db.$transaction(async (tx) => {
    const ticketStatus = await lockTicket(tx, ticketId)
    const current = await loadAction(tx, ticketId, actionId)
    requireCurrent(current, version.value, ticketStatus)

    if (judgeMove(current.status, target) !== 'allowed') {
      throw new ApiError(400, 'INVALID_ACTION_TRANSITION', `An Action that is ${current.status} cannot move to ${target}.`, [], {
        currentStatus: current.status,
        permittedTransitions: [...permittedMoves(current.status)],
      })
    }

    const changes: Prisma.ActionTakenUncheckedUpdateInput = { status: target, version: { increment: 1 } }
    if (target === 'COMPLETED') {
      const outcome = effectiveResult(current.result, data.result)
      if (outcome.errors.length > 0) throw validationFailed(outcome.errors)
      changes.result = outcome.value
      changes.completedById = callerId
      changes.completedAt = now
    }
    if (target === 'CANCELLED') {
      changes.cancelledById = callerId
      changes.cancelledAt = now
      changes.cancellationReason = reason!.value
    }

    const updated = await tx.actionTaken.update({ where: { id: actionId }, data: changes, include: INCLUDE })
    await touchTicket(tx, ticketId, now)
    await appendEvents(tx, now, [
      {
        ticketId,
        actionId,
        actorId: callerId,
        type: TRANSITION_EVENT[target as keyof typeof TRANSITION_EVENT],
        payload: actionMovedPayload({ from: current.status, to: target }),
      },
    ])
    return view(updated, true)
  })
}
