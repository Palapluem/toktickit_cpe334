import express from 'express'
import cors from 'cors'
import prisma from './prisma.js'
import { errorHandler } from './http/errors.js'
import { requireRequesterContext } from './middleware/requesterContext.js'
import {
  createTicket,
  sendTicketCreationError,
  TicketCreationError,
  type CreateTicketOptions,
} from './tickets/createTicket.js'

export function createApp(options: CreateTicketOptions = {}) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Minimal placeholder proving the server starts (Issue 1 scope only).
  app.get('/', (_req, res) => {
    res.json({ message: 'TokTickIT API foundation running' })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'TokTickIT API' })
  })

  // Reference data (api-spec.md §2). All three: data envelope, isActive filter,
  // explicit name ordering (§11.15).

  app.get('/api/categories', async (_req, res) => {
    const data = await (options.db ?? prisma).category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    res.json({ data })
  })

  app.get('/api/related-systems', async (_req, res) => {
    const data = await (options.db ?? prisma).relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    res.json({ data })
  })

  app.get('/api/requesters', async (_req, res) => {
    const data = await (options.db ?? prisma).requesterUser.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      // isActive withheld: exposing it invites the client to treat the selector
      // as authorization (BR-03, BR-14).
      select: { id: true, displayName: true, email: true },
    })
    res.json({ data })
  })

  app.post('/api/tickets', requireRequesterContext, async (req, res, next) => {
    try {
      const ticket = await createTicket(
        { requesterId: req.requester!.id, body: req.body },
        options,
      )
      const stored = await (options.db ?? prisma).ticket.findUniqueOrThrow({
        where: { id: ticket.id },
        include: {
          requester: { select: { id: true, displayName: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              originalFilename: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
              removedAt: true,
            },
          },
        },
      })
      res.status(201).json({
        data: {
          ...stored,
          owner: null,
          attachmentFailures: [],
        },
      })
    } catch (error) {
      if (error instanceof TicketCreationError) {
        sendTicketCreationError(error, res)
        return
      }
      next(error)
    }
  })

  // Must be registered after all routes so Express 5 async failures reach the
  // contract-preserving handler instead of its stack/HTML default response.
  app.use(errorHandler)

  return app
}

const app = createApp()
export default app
