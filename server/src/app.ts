import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import multer from 'multer'
import prisma from './prisma.js'
import { ApiError, errorHandler, sendError } from './http/errors.js'
import {
  requireAuth,
  requirePasswordChanged,
} from './middleware/authContext.js'
import { requireOperation } from './middleware/authorize.js'
import { authenticate, changePassword } from './auth/service.js'
import {
  SESSION_COOKIE,
  endSession,
  sessionCookieOptions,
  startSession,
} from './auth/session.js'
import {
  createTicket,
  type CreateTicketOptions,
} from './tickets/createTicket.js'
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS,
} from './tickets/attachmentRules.js'
import { listTickets } from './tickets/listTickets.js'
import { listStaffQueue } from './staff/staffQueue.js'
import { UUID } from './tickets/validation.js'
import {
  addTicketAttachment,
  downloadTicketAttachment,
  getTicketDetail,
  listTicketAttachments,
  removeTicketAttachment,
} from './tickets/ticketDetail.js'

type AttachmentRequest = Request & {
  lastAttachmentFilename?: string
  lastAttachmentIndex?: number
}

const attachmentUpload = multer({
  // Keep bytes in memory through validation; the adapter writes only after commit (BR-34).
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    files: MAX_ATTACHMENTS + 1,
  },
  fileFilter: (req, file, callback) => {
    const attachmentRequest = req as AttachmentRequest
    attachmentRequest.lastAttachmentFilename = file.originalname
    attachmentRequest.lastAttachmentIndex =
      (attachmentRequest.lastAttachmentIndex ?? -1) + 1
    callback(null, true)
  },
})

const singleAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
  fileFilter: (req, file, callback) => {
    const attachmentRequest = req as AttachmentRequest
    attachmentRequest.lastAttachmentFilename = file.originalname
    attachmentRequest.lastAttachmentIndex = 0
    callback(null, true)
  },
})

function parseAttachments(req: Request, res: Response, next: NextFunction) {
  attachmentUpload.array('attachments', MAX_ATTACHMENTS + 1)(
    req,
    res,
    (error: unknown) => {
      if (!error) {
        next()
        return
      }
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          const attachmentRequest = req as AttachmentRequest
          const filename = attachmentRequest.lastAttachmentFilename
          const index = attachmentRequest.lastAttachmentIndex
          sendError(
            res,
            413,
            'FILE_TOO_LARGE',
            'Each attachment must be 5 MB or smaller.',
            [
              {
                field: index === undefined ? 'attachments' : `attachments[${index}]`,
                message: filename
                  ? `${filename} exceeds the 5 MB limit.`
                  : 'The uploaded attachment exceeds the 5 MB limit.',
              },
            ],
          )
          return
        }
        sendError(
          res,
          400,
          'VALIDATION_FAILED',
          'The attachment fields are invalid.',
          [{ field: 'attachments', message: 'Too many attachments were supplied.' }],
        )
        return
      }
      next(error)
    },
  )
}

function parseSingleAttachment(req: Request, res: Response, next: NextFunction) {
  singleAttachmentUpload.single('attachment')(req, res, (error: unknown) => {
    if (!error) {
      next()
      return
    }
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const attachmentRequest = req as AttachmentRequest
        const filename = attachmentRequest.lastAttachmentFilename
        sendError(
          res,
          413,
          'FILE_TOO_LARGE',
          'The attachment must be 5 MB or smaller.',
          [
            {
              field: 'attachment',
              message: filename
                ? `${filename} exceeds the 5 MB limit.`
                : 'The uploaded attachment exceeds the 5 MB limit.',
            },
          ],
        )
        return
      }
      sendError(
        res,
        400,
        'VALIDATION_FAILED',
        'The attachment field is invalid.',
        [{ field: 'attachment', message: 'Choose one attachment file.' }],
      )
      return
    }
    next(error)
  })
}

function toAttachmentFile(file: Express.Multer.File | undefined) {
  return file
    ? {
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        buffer: file.buffer,
      }
    : undefined
}

function toAttachmentFiles(files: Express.Multer.File[] | undefined) {
  return (files ?? []).map((file) => toAttachmentFile(file)!)
}

function sanitizeDownloadFilename(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').pop() ?? ''
  const safe = basename.replace(/[\u0000-\u001f\u007f"]/g, '_').trim()
  return safe || 'download'
}

function contentDisposition(filename: string): string {
  const safe = sanitizeDownloadFilename(filename)
  const asciiFallback = safe.replace(/[^\x20-\x7e]/g, '_') || 'download'
  if (asciiFallback === safe) return `attachment; filename="${asciiFallback}"`

  const encoded = encodeURIComponent(safe).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
}

function routeParameter(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function ticketParameter(value: string | string[] | undefined): string {
  const id = routeParameter(value)
  if (!UUID.test(id)) throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket not found.')
  return id
}

function attachmentParameter(value: string | string[] | undefined): string {
  const id = routeParameter(value)
  if (!UUID.test(id)) {
    throw new ApiError(404, 'ATTACHMENT_NOT_FOUND', 'Attachment not found.')
  }
  return id
}

export function createApp(options: CreateTicketOptions = {}) {
  const app = express()

  // credentials: the session cookie must travel on cross-origin XHR in dev,
  // where the client is served from a different port (api-spec.md §1).
  // Reflecting the request's own origin is a documented dev convenience
  // (.env.example) — never something a real deployment should inherit
  // silently, since combined with credentials:true it accepts a
  // cookie-carrying request from any site.
  if (!process.env.CLIENT_ORIGIN && process.env.NODE_ENV === 'production') {
    throw new Error('CLIENT_ORIGIN must be set outside local development.')
  }
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? true, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  // Minimal placeholder proving the server starts (Issue 1 scope only).
  app.get('/', (_req, res) => {
    res.json({ message: 'TokTickIT API foundation running' })
  })

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'TokTickIT API' })
  })

  // Authentication (api-spec.md §3). The session cookie is the only identity
  // these endpoints accept; nothing reads a role from the request.

  app.post('/api/auth/login', async (req, res) => {
    const user = await authenticate(req.body?.email, req.body?.password)
    if (user === null) {
      // One body for unknown email, wrong password, and inactive (SEC-002).
      sendError(
        res,
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      )
      return
    }

    const { token, expiresAt } = await startSession(user.id)
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
    res.json({ data: user })
  })

  // No requireAuth: logging out of nothing is not an error, and reporting one
  // would confirm whether a token was valid (api-spec.md §3).
  app.post('/api/auth/logout', async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE]
    if (typeof token === 'string' && token.length > 0) await endSession(token)
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    res.json({ data: { loggedOut: true } })
  })

  // Exempt from the must-change gate, so the client can discover why it is
  // being refused without a special case (api-spec.md §4).
  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ data: req.user })
  })

  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    await changePassword(
      req.user!.id,
      req.body?.currentPassword,
      req.body?.newPassword,
      req.sessionToken!,
    )
    res.json({ data: { passwordChanged: true } })
  })

  // Reference data (api-spec.md §2). All three: data envelope, isActive filter,
  // explicit name ordering (§11.15).

  app.get('/api/categories', requireAuth, requirePasswordChanged, async (_req, res) => {
    const data = await (options.db ?? prisma).category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    res.json({ data })
  })

  app.get(
    '/api/related-systems',
    requireAuth,
    requirePasswordChanged,
    async (_req, res) => {
    const data = await (options.db ?? prisma).relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      })
      res.json({ data })
    },
  )

  // The staff queue (api-spec.md §8). Not user-scoped, so the role check is
  // the only thing between a Requester and every Ticket in the system.
  app.get(
    '/api/staff/tickets',
    requireAuth,
    requirePasswordChanged,
    requireOperation('staffQueue:read'),
    async (req, res) => {
      const data = await listStaffQueue(
        req.user!.id,
        req.query,
        options.db ?? prisma,
      )
      res.json(data)
    },
  )

  app.get(
    '/api/tickets',
    requireAuth,
    requirePasswordChanged,
    requireOperation('ticket:listOwn'),
    async (req, res) => {
    const data = await listTickets(
      req.user!.id,
      req.query,
      options.db ?? prisma,
    )
    res.json(data)
  })

  app.post(
    '/api/tickets',
    requireAuth,
    requirePasswordChanged,
    requireOperation('ticket:create'),
    parseAttachments,
    // Express 5 forwards rejected async handlers to the final error middleware.
    async (req, res) => {
      const files = Array.isArray(req.files) ? toAttachmentFiles(req.files) : []
      const ticket = await createTicket(
        { requesterId: req.user!.id, body: req.body, attachments: files },
        options,
      )
      const stored = await (options.db ?? prisma).ticket.findUniqueOrThrow({
        where: { id: ticket.id },
        select: {
          id: true,
          ticketNo: true,
          createdAt: true,
          updatedAt: true,
          summary: true,
          description: true,
          requestedPriority: true,
          itPriority: true,
          status: true,
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
          id: stored.id,
          ticketNo: stored.ticketNo,
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt,
          summary: stored.summary,
          description: stored.description,
          requestedPriority: stored.requestedPriority,
          itPriority: stored.itPriority,
          status: stored.status,
          requester: stored.requester,
          category: stored.category,
          relatedSystem: stored.relatedSystem,
          owner: null,
          attachments: stored.attachments,
          attachmentFailures: ticket.attachmentFailures,
        },
      })
    },
  )

  // Requester-scoped, as in Lab 2. IT Staff and Administrator read any Ticket
  // through /api/staff/tickets/:id, which L3-7 delivers.
  app.get(
    '/api/tickets/:id',
    requireAuth,
    requirePasswordChanged,
    requireOperation('ticket:read'),
    async (req, res) => {
    const data = await getTicketDetail(
      ticketParameter(req.params.id),
      req.user!.id,
      options.db ?? prisma,
    )
    res.json({ data })
  })

  app.get(
    '/api/tickets/:id/attachments',
    requireAuth,
    requirePasswordChanged,
    requireOperation('attachment:manage'),
    async (req, res) => {
      const data = await listTicketAttachments(
        ticketParameter(req.params.id),
        req.user!.id,
        options.db ?? prisma,
      )
      res.json(data)
    },
  )

  app.post(
    '/api/tickets/:id/attachments',
    requireAuth,
    requirePasswordChanged,
    requireOperation('attachment:manage'),
    parseSingleAttachment,
    async (req, res) => {
      const data = await addTicketAttachment(
        ticketParameter(req.params.id),
        req.user!.id,
        toAttachmentFile(req.file),
        options,
      )
      res.status(201).json(data)
    },
  )

  app.get(
    '/api/attachments/:id/download',
    requireAuth,
    requirePasswordChanged,
    requireOperation('attachment:manage'),
    async (req, res, next) => {
      const { attachment, stream } = await downloadTicketAttachment(
        attachmentParameter(req.params.id),
        req.user!.id,
        options,
      )
      res.setHeader('Content-Type', attachment.mimeType)
      res.setHeader('Content-Disposition', contentDisposition(attachment.originalFilename))
      res.setHeader('Content-Length', String(attachment.sizeBytes))
      res.setHeader('X-Content-Type-Options', 'nosniff')
      stream.once('error', next)
      stream.pipe(res)
    },
  )

  app.delete(
    '/api/attachments/:id',
    requireAuth,
    requirePasswordChanged,
    requireOperation('attachment:manage'),
    async (req, res) => {
      const data = await removeTicketAttachment(
        attachmentParameter(req.params.id),
        req.user!.id,
        req.body?.reason,
        options,
      )
      res.json(data)
    },
  )

  // Must be registered after all routes so Express 5 async failures reach the
  // contract-preserving handler instead of its stack/HTML default response.
  app.use(errorHandler)

  return app
}

const app = createApp()
export default app
