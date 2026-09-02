import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import multer from 'multer'
import prisma from './prisma.js'
import { errorHandler, sendError } from './http/errors.js'
import { requireRequesterContext } from './middleware/requesterContext.js'
import {
  createTicket,
  type CreateTicketOptions,
} from './tickets/createTicket.js'
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS,
} from './tickets/attachmentRules.js'
import { listTickets } from './tickets/listTickets.js'
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

function sanitizeDownloadFilename(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').pop() ?? ''
  const safe = basename.replace(/[\u0000-\u001f\u007f"]/g, '_').trim()
  return safe || 'download'
}

function routeParameter(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

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

  app.get('/api/tickets', requireRequesterContext, async (req, res) => {
    const data = await listTickets(
      req.requester!.id,
      req.query,
      options.db ?? prisma,
    )
    res.json(data)
  })

  app.post(
    '/api/tickets',
    requireRequesterContext,
    parseAttachments,
    // Express 5 forwards rejected async handlers to the final error middleware.
    async (req, res) => {
      const files = Array.isArray(req.files)
        ? req.files.map((file) => ({
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            buffer: file.buffer,
          }))
        : []
      const ticket = await createTicket(
        { requesterId: req.requester!.id, body: req.body, attachments: files },
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
          attachmentFailures: ticket.attachmentFailures,
        },
      })
    },
  )

  app.get('/api/tickets/:id', requireRequesterContext, async (req, res) => {
    const data = await getTicketDetail(
      routeParameter(req.params.id),
      req.requester!.id,
      options.db ?? prisma,
    )
    res.json({ data })
  })

  app.get(
    '/api/tickets/:id/attachments',
    requireRequesterContext,
    async (req, res) => {
      const data = await listTicketAttachments(
        routeParameter(req.params.id),
        req.requester!.id,
        options.db ?? prisma,
      )
      res.json(data)
    },
  )

  app.post(
    '/api/tickets/:id/attachments',
    requireRequesterContext,
    parseSingleAttachment,
    async (req, res) => {
      const data = await addTicketAttachment(
        routeParameter(req.params.id),
        req.requester!.id,
        toAttachmentFile(req.file),
        options,
      )
      res.status(201).json(data)
    },
  )

  app.get(
    '/api/attachments/:id/download',
    requireRequesterContext,
    async (req, res, next) => {
      const { attachment, stream } = await downloadTicketAttachment(
        routeParameter(req.params.id),
        req.requester!.id,
        options,
      )
      res.setHeader('Content-Type', attachment.mimeType)
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${sanitizeDownloadFilename(attachment.originalFilename)}"`,
      )
      res.setHeader('Content-Length', String(attachment.sizeBytes))
      res.setHeader('X-Content-Type-Options', 'nosniff')
      stream.once('error', next)
      stream.pipe(res)
    },
  )

  app.delete(
    '/api/attachments/:id',
    requireRequesterContext,
    async (req, res) => {
      const data = await removeTicketAttachment(
        routeParameter(req.params.id),
        req.requester!.id,
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
