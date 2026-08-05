import express from 'express'
import cors from 'cors'
import prisma from './prisma.js'

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

app.get('/api/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  })
  res.json(categories)
})

export default app
