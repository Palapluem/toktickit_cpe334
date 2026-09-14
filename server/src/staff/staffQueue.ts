// The staff queue (api-spec.md §8). The one list in the product that is not
// user-scoped, which makes it the one place where a missing role check exposes
// everything — the route mounts requireOperation('staffQueue:read') (SEC-016).
import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { ApiError } from '../http/errors.js'
import {
  parseQueueQuery,
  type QueueQuery,
  type QueueSortField,
} from './queueQuery.js'

const QUEUE_SELECT = {
  id: true,
  ticketNo: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  status: true,
  requesterResolvedAt: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  requester: { select: { id: true, displayName: true } },
  owner: { select: { id: true, displayName: true } },
} as const

/**
 * `lastActivityAt` is the whitelist name; `updatedAt` is the column that holds
 * it. The alias is kept because the contract names it, and inventing a second
 * timestamp that always equals this one would be worse than the alias.
 */
function orderByFor(query: QueueQuery): Prisma.TicketOrderByWithRelationInput[] {
  const direction = query.sort.direction
  const primary: Record<QueueSortField, Prisma.TicketOrderByWithRelationInput> = {
    createdAt: { createdAt: direction },
    updatedAt: { updatedAt: direction },
    lastActivityAt: { updatedAt: direction },
    ticketNo: { ticketNo: direction },
    itPriority: { itPriority: direction },
    status: { status: direction },
  }

  // Oldest first as the tiebreaker: the default asks what is most urgent and
  // has waited longest, and ticketNo keeps the page boundary stable.
  return [primary[query.sort.field], { createdAt: 'asc' }, { ticketNo: 'asc' }]
}

async function validateCategoryFilter(
  query: QueueQuery,
  db: PrismaClient,
): Promise<void> {
  if (!query.categoryId) return

  const category = await db.category.findFirst({
    where: { id: query.categoryId, isActive: true },
    select: { id: true },
  })
  if (category) return

  throw new ApiError(400, 'VALIDATION_FAILED', 'One or more query parameters are invalid.', [
    { field: 'categoryId', message: 'Choose an existing category.' },
  ])
}

function ownerWhere(
  query: QueueQuery,
  callerId: string,
): Prisma.TicketWhereInput {
  switch (query.owner.kind) {
    case 'unassigned':
      return { ownerId: null }
    case 'me':
      return { ownerId: callerId }
    case 'user':
      return { ownerId: query.owner.id }
    default:
      return {}
  }
}

function appliedOwnerId(query: QueueQuery): string | null {
  switch (query.owner.kind) {
    case 'unassigned':
      return 'unassigned'
    case 'me':
      return 'me'
    case 'user':
      return query.owner.id
    default:
      return null
  }
}

export async function listStaffQueue(
  callerId: string,
  rawQuery: unknown,
  db: PrismaClient,
) {
  const { value: query, errors } = parseQueueQuery(rawQuery)
  if (errors.length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'One or more query parameters are invalid.',
      errors,
    )
  }

  await validateCategoryFilter(query, db)

  const where: Prisma.TicketWhereInput = {
    ...(query.search
      ? {
          OR: [
            { ticketNo: { contains: query.search, mode: 'insensitive' } },
            { summary: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.itPriority ? { itPriority: query.itPriority } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...ownerWhere(query, callerId),
  }

  const skip = (query.page - 1) * query.pageSize
  const [totalItems, rows] = await Promise.all([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      select: QUEUE_SELECT,
      orderBy: orderByFor(query),
      skip,
      take: query.pageSize,
    }),
  ])

  const totalPages = Math.ceil(totalItems / query.pageSize)
  return {
    data: rows,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: query.page > 1,
      hasNextPage: query.page < totalPages,
    },
    appliedFilters: {
      search: query.search,
      status: query.status,
      itPriority: query.itPriority,
      categoryId: query.categoryId,
      ownerId: appliedOwnerId(query),
      sort: `${query.sort.field}:${query.sort.direction}`,
    },
  }
}
