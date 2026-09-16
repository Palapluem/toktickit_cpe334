// SEC-T02, SEC-T03. Object-level authorization: the half of SEC-017 that role
// alone cannot decide. Resolved from the authenticated identity, never from
// anything the caller sends (SEC-018).
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../../src/prisma.js'
import { findTicketForCaller } from '../../src/tickets/ownership.js'
import { OTHER_REQUESTER_EMAIL, REQUESTER_EMAIL, STAFF_EMAIL } from './auth-fixtures.js'

let mine: { id: string; requesterId: string }
let theirs: { id: string; requesterId: string }
let requesterId: string
let otherRequesterId: string
let staffId: string

async function idFor(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  })
  return user.id
}

// Its own Tickets rather than the seed's: the Lab 2 suite clears Ticket data,
// and a test that depends on what ran before it is not a test.
const TICKET_NUMBERS = ['TKT-2026-990001', 'TKT-2026-990002'] as const

async function makeTicket(
  ticketNo: string,
  ownerRequesterId: string,
): Promise<{ id: string; requesterId: string }> {
  const [category, relatedSystem] = await Promise.all([
    prisma.category.findFirstOrThrow({ select: { id: true } }),
    prisma.relatedSystem.findFirstOrThrow({ select: { id: true } }),
  ])
  return prisma.ticket.upsert({
    where: { ticketNo },
    update: { requesterId: ownerRequesterId },
    create: {
      ticketNo,
      requesterId: ownerRequesterId,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: 'Ownership fixture',
      description: 'Created by ownership.api.test.ts.',
      requestedPriority: 'LOW',
      itPriority: 'LOW',
    },
    select: { id: true, requesterId: true },
  })
}

beforeAll(async () => {
  requesterId = await idFor(REQUESTER_EMAIL)
  otherRequesterId = await idFor(OTHER_REQUESTER_EMAIL)
  staffId = await idFor(STAFF_EMAIL)

  mine = await makeTicket(TICKET_NUMBERS[0], requesterId)
  theirs = await makeTicket(TICKET_NUMBERS[1], otherRequesterId)
})

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { ticketNo: { in: [...TICKET_NUMBERS] } } })
})

describe('SEC-T02 · AC-08 · an `own` grant reaches only the caller’s records (SEC-019)', () => {
  it('resolves a Ticket the caller submitted', async () => {
    const ticket = await findTicketForCaller(mine.id, requesterId, 'own')
    expect(ticket?.id).toBe(mine.id)
    expect(ticket?.requesterId).toBe(requesterId)
  })

  it('does not resolve another Requester’s Ticket', async () => {
    // The positive control: the same id resolves for the user who owns it.
    expect(await findTicketForCaller(theirs.id, otherRequesterId, 'own')).not.toBeNull()

    expect(await findTicketForCaller(theirs.id, requesterId, 'own')).toBeNull()
  })

  it('filters inside the query rather than after it', async () => {
    // If the filter were applied to a result already fetched, a caller could
    // still observe the row. The only observable difference is the grant.
    expect(await findTicketForCaller(theirs.id, requesterId, 'own')).toBeNull()
    expect(await findTicketForCaller(theirs.id, requesterId, 'any')).not.toBeNull()
  })
})

describe('SEC-T03 · AC-13 · a refusal is indistinguishable from absence (BR-14, SEC-024)', () => {
  it('answers null for a Ticket that does not exist and for one that is not theirs', async () => {
    const absent = await findTicketForCaller(
      '00000000-0000-4000-8000-000000000000',
      requesterId,
      'own',
    )
    const forbidden = await findTicketForCaller(theirs.id, requesterId, 'own')

    expect(absent).toBeNull()
    expect(forbidden).toBeNull()
    expect(forbidden).toEqual(absent)
  })

  it('answers null for a malformed identifier instead of throwing', async () => {
    expect(await findTicketForCaller('not-a-uuid', requesterId, 'own')).toBeNull()
    expect(await findTicketForCaller('', requesterId, 'own')).toBeNull()
  })
})

describe('SEC-T03 · an `any` grant reaches every Ticket', () => {
  it('resolves Tickets belonging to different Requesters', async () => {
    expect((await findTicketForCaller(mine.id, staffId, 'any'))?.id).toBe(mine.id)
    expect((await findTicketForCaller(theirs.id, staffId, 'any'))?.id).toBe(theirs.id)
  })

  it('still answers null for a Ticket that is not there', async () => {
    expect(
      await findTicketForCaller('00000000-0000-4000-8000-000000000000', staffId, 'any'),
    ).toBeNull()
  })

  it('carries the fields a handler needs to decide the rest', async () => {
    const ticket = await findTicketForCaller(mine.id, staffId, 'any')
    expect(ticket).toMatchObject({
      id: mine.id,
      requesterId: mine.requesterId,
    })
    expect(ticket?.status).toBeTruthy()
  })
})
