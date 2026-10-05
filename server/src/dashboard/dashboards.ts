import { Prisma, type PrismaClient } from '../generated/prisma/client.js'
import { TICKET_STATUSES } from '../tickets/validation.js'
import { ACTIVE_STATUSES, REQUESTER_METRIC_QUERIES, STAFF_METRIC_QUERIES } from './metrics.js'

const OPEN_ACTION_STATUSES = ['PLANNED', 'IN_PROGRESS'] as const

type StaffAggregate = {
  unassigned: bigint
  assignedToMe: bigint
  urgent: bigint
  waitingForRequester: bigint
}

type RequesterAggregate = {
  totalTickets: bigint
  open: bigint
  needsAttention: bigint
  resolved: bigint
  closed: bigint
}

const toCount = (value: bigint | number): number => Number(value)
const activeStatusesSql = Prisma.join(
  ACTIVE_STATUSES.map((status) => Prisma.sql`${status}::"TicketStatus"`),
)

export async function getStaffDashboard(staffId: string, db: PrismaClient) {
  const [aggregateRows, statusRows, openActionTotal, actions, recentTickets] =
    await Promise.all([
      db.$queryRaw<StaffAggregate[]>`
        SELECT
          COUNT(*) FILTER (WHERE "ownerId" IS NULL AND "status" IN (${activeStatusesSql})) AS "unassigned",
          COUNT(*) FILTER (WHERE "ownerId" = ${staffId}::uuid AND "status" IN (${activeStatusesSql})) AS "assignedToMe",
          COUNT(*) FILTER (WHERE "itPriority" = 'URGENT' AND "status" IN (${activeStatusesSql})) AS "urgent",
          COUNT(*) FILTER (WHERE "status" = 'WAITING_FOR_REQUESTER') AS "waitingForRequester"
        FROM "Ticket"
      `,
      db.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
      db.actionTaken.count({
        where: { assigneeId: staffId, status: { in: [...OPEN_ACTION_STATUSES] } },
      }),
      db.actionTaken.findMany({
        where: { assigneeId: staffId, status: { in: [...OPEN_ACTION_STATUSES] } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 10,
        select: {
          id: true,
          status: true,
          description: true,
          createdAt: true,
          ticket: {
            select: {
              id: true,
              ticketNo: true,
              summary: true,
              itPriority: true,
              status: true,
            },
          },
        },
      }),
      db.ticket.findMany({
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 5,
        select: {
          id: true,
          ticketNo: true,
          summary: true,
          status: true,
          itPriority: true,
          updatedAt: true,
          owner: { select: { displayName: true } },
        },
      }),
    ])

  const aggregate = aggregateRows[0]
  const statusCounts = new Map(
    statusRows.map((row) => [row.status, row._count._all]),
  )

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      unassigned: {
        count: toCount(aggregate?.unassigned ?? 0),
        query: STAFF_METRIC_QUERIES.unassigned,
      },
      assignedToMe: {
        count: toCount(aggregate?.assignedToMe ?? 0),
        query: STAFF_METRIC_QUERIES.assignedToMe,
      },
      urgent: {
        count: toCount(aggregate?.urgent ?? 0),
        query: STAFF_METRIC_QUERIES.urgent,
      },
      waitingForRequester: {
        count: toCount(aggregate?.waitingForRequester ?? 0),
        query: STAFF_METRIC_QUERIES.waitingForRequester,
      },
    },
    byStatus: TICKET_STATUSES.map((status) => ({
      status,
      count: toCount(statusCounts.get(status) ?? 0),
      query: { status },
    })),
    myOpenActions: {
      total: openActionTotal,
      items: actions.map((action) => ({
        actionId: action.id,
        status: action.status,
        description: action.description.slice(0, 120),
        actionAt: action.createdAt,
        ticket: action.ticket,
      })),
    },
    recentlyUpdated: recentTickets,
    recentlyUpdatedQuery: { sort: 'updatedAt:desc' },
  }
}

export async function getRequesterDashboard(requesterId: string, db: PrismaClient) {
  const [aggregateRows, recentTickets] = await Promise.all([
    db.$queryRaw<RequesterAggregate[]>`
      SELECT
        COUNT(*) AS "totalTickets",
        COUNT(*) FILTER (WHERE "status" IN (${activeStatusesSql})) AS "open",
        COUNT(*) FILTER (WHERE "status" = 'WAITING_FOR_REQUESTER') AS "needsAttention",
        COUNT(*) FILTER (WHERE "status" = 'RESOLVED') AS "resolved",
        COUNT(*) FILTER (WHERE "status" = 'CLOSED') AS "closed"
      FROM "Ticket" WHERE "requesterId" = ${requesterId}::uuid
    `,
    db.ticket.findMany({
      where: { requesterId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 5,
      select: {
        id: true,
        ticketNo: true,
        summary: true,
        status: true,
        updatedAt: true,
      },
    }),
  ])

  const aggregate = aggregateRows[0]
  return {
    generatedAt: new Date().toISOString(),
    totalTickets: toCount(aggregate?.totalTickets ?? 0),
    metrics: {
      open: {
        count: toCount(aggregate?.open ?? 0),
        query: REQUESTER_METRIC_QUERIES.open,
      },
      needsAttention: {
        count: toCount(aggregate?.needsAttention ?? 0),
        query: REQUESTER_METRIC_QUERIES.needsAttention,
      },
      resolved: {
        count: toCount(aggregate?.resolved ?? 0),
        query: REQUESTER_METRIC_QUERIES.resolved,
      },
      closed: {
        count: toCount(aggregate?.closed ?? 0),
        query: REQUESTER_METRIC_QUERIES.closed,
      },
    },
    recentlyUpdated: recentTickets,
    recentlyUpdatedQuery: { sort: 'updatedAt:desc' },
  }
}
