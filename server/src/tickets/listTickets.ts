import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { ApiError } from '../http/errors.js'
import {
  parseTicketQuery,
  type SortField,
  type TicketListQuery,
} from './query.js'

const TICKET_LIST_SELECT = {
  id: true,
  ticketNo: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  _count: {
    select: {
      attachments: { where: { removedAt: null } },
    },
  },
} as const

function orderByFor(query: TicketListQuery): Prisma.TicketOrderByWithRelationInput[] {
  const direction = query.sort.direction
  const primaryByField: Record<SortField, Prisma.TicketOrderByWithRelationInput> = {
    createdAt: { createdAt: direction },
    updatedAt: { updatedAt: direction },
    ticketNo: { ticketNo: direction },
    summary: { summary: direction },
    requestedPriority: { requestedPriority: direction },
    status: { status: direction },
  }

  return [primaryByField[query.sort.field], { ticketNo: 'desc' }]
}

async function validateReferenceFilters(
  query: TicketListQuery,
  db: PrismaClient,
): Promise<void> {
  const [category, relatedSystem] = await Promise.all([
    query.categoryId
      ? db.category.findUnique({
          where: { id: query.categoryId },
          select: { id: true },
        })
      : Promise.resolve(null),
    query.relatedSystemId
      ? db.relatedSystem.findUnique({
          where: { id: query.relatedSystemId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  const fieldErrors = []
  if (query.categoryId && !category) {
    fieldErrors.push({
      field: 'categoryId',
      message: 'Choose an existing category.',
    })
  }
  if (query.relatedSystemId && !relatedSystem) {
    fieldErrors.push({
      field: 'relatedSystemId',
      message: 'Choose an existing related system.',
    })
  }

  if (fieldErrors.length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'One or more query parameters are invalid.',
      fieldErrors,
    )
  }
}

export async function listTickets(
  requesterId: string,
  rawQuery: unknown,
  db: PrismaClient,
) {
  const { value: query, errors } = parseTicketQuery(rawQuery)
  if (errors.length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_FAILED',
      'One or more query parameters are invalid.',
      errors,
    )
  }

  await validateReferenceFilters(query, db)

  const where: Prisma.TicketWhereInput = {
    requesterId,
    ...(query.search
      ? {
          OR: [
            { ticketNo: { contains: query.search, mode: 'insensitive' } },
            { summary: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.relatedSystemId
      ? { relatedSystemId: query.relatedSystemId }
      : {}),
    ...(query.requestedPriority
      ? { requestedPriority: query.requestedPriority }
      : {}),
    ...(query.itPriority ? { itPriority: query.itPriority } : {}),
    ...(query.status ? { status: query.status } : {}),
  }

  const skip = (query.page - 1) * query.pageSize
  const [totalItems, rows] = await Promise.all([
    db.ticket.count({ where }),
    db.ticket.findMany({
      where,
      select: TICKET_LIST_SELECT,
      orderBy: orderByFor(query),
      skip,
      take: query.pageSize,
    }),
  ])

  const totalPages = Math.ceil(totalItems / query.pageSize)
  return {
    data: rows.map((row) => ({
      id: row.id,
      ticketNo: row.ticketNo,
      summary: row.summary,
      category: row.category,
      relatedSystem: row.relatedSystem,
      requestedPriority: row.requestedPriority,
      itPriority: row.itPriority,
      status: row.status,
      owner: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      activeAttachmentCount: row._count.attachments,
    })),
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
      categoryId: query.categoryId,
      relatedSystemId: query.relatedSystemId,
      requestedPriority: query.requestedPriority,
      itPriority: query.itPriority,
      status: query.status,
      sort: `${query.sort.field}:${query.sort.direction}`,
    },
  }
}
