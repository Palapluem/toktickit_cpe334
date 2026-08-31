import express from 'express'
import cors from 'cors'
import prisma from './prisma.js'
import { errorHandler } from './http/errors.js'

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
  const data = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  res.json({ data })
})

app.get('/api/related-systems', async (_req, res) => {
  const data = await prisma.relatedSystem.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  res.json({ data })
})

app.get('/api/requesters', async (_req, res) => {
  const data = await prisma.requesterUser.findMany({
    where: { isActive: true },
    orderBy: { displayName: 'asc' },
    // isActive withheld: exposing it invites the client to treat the selector
    // as authorization (BR-03, BR-14).
    select: { id: true, displayName: true, email: true },
  })
  res.json({ data })
})

// Must be registered after all routes so Express 5 async failures reach the
// contract-preserving handler instead of its stack/HTML default response.
app.use(errorHandler)

export default app
