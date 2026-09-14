import prisma from '../../src/prisma.js'
// The shared authenticated-request fixture from Issue #46. Lab 2 tests changed
// how they authenticate, never what they assert.
import {
  OTHER_REQUESTER_EMAIL,
  REQUESTER_EMAIL,
  signIn,
} from '../lab-03/auth-fixtures.js'

export const BASE_TICKET_PAYLOAD = {
  summary: 'Laptop battery drains quickly',
  description:
    'The laptop battery drains much faster than usual even when the system is idle.',
  requestedPriority: 'MEDIUM' as const,
}

export type TicketReferences = {
  requesterId: string
  /** A live session for that requester, for `.set('Cookie', …)`. */
  cookie: string
  categoryId: string
  relatedSystemId: string
}

export async function loadTicketReferences(): Promise<TicketReferences> {
  // A named requester rather than "the first active one": the test has to be
  // able to log in as them, which needs a known account.
  const [requester, category, relatedSystem, cookie] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: REQUESTER_EMAIL } }),
    prisma.category.findFirstOrThrow({ where: { isActive: true } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
    signIn(REQUESTER_EMAIL),
  ])

  return {
    requesterId: requester.id,
    cookie,
    categoryId: category.id,
    relatedSystemId: relatedSystem.id,
  }
}

/** The second Requester, for the ownership refusals (lab-02 BR-16). */
export async function loadOtherRequester(): Promise<{
  requesterId: string
  cookie: string
}> {
  const [other, cookie] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: OTHER_REQUESTER_EMAIL } }),
    signIn(OTHER_REQUESTER_EMAIL),
  ])
  return { requesterId: other.id, cookie }
}

export async function resetTicketData(): Promise<void> {
  await prisma.attachment.deleteMany()
  // Comments and notes hold RESTRICT keys to Ticket, so they clear first.
  await prisma.publicComment.deleteMany()
  await prisma.internalNote.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.ticketNumberSequence.deleteMany()
}

export function validTicketPayload(
  references: TicketReferences,
  overrides: Record<string, unknown> = {},
) {
  return {
    ...BASE_TICKET_PAYLOAD,
    categoryId: references.categoryId,
    relatedSystemId: references.relatedSystemId,
    ...overrides,
  }
}
