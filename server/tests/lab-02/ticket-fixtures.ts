import prisma from '../../src/prisma.js'

export const BASE_TICKET_PAYLOAD = {
  summary: 'Laptop battery drains quickly',
  description:
    'The laptop battery drains much faster than usual even when the system is idle.',
  requestedPriority: 'MEDIUM' as const,
}

export type TicketReferences = {
  requesterId: string
  categoryId: string
  relatedSystemId: string
}

export async function loadTicketReferences(): Promise<TicketReferences> {
  const [requester, category, relatedSystem] = await Promise.all([
    prisma.requesterUser.findFirstOrThrow({ where: { isActive: true } }),
    prisma.category.findFirstOrThrow({ where: { isActive: true } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ])

  return {
    requesterId: requester.id,
    categoryId: category.id,
    relatedSystemId: relatedSystem.id,
  }
}

export async function resetTicketData(): Promise<void> {
  await prisma.attachment.deleteMany()
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
