import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

// Minimal placeholder proving the server starts (Issue 1 scope only).
// /api/categories is implemented in Issue 4.
app.get('/', (_req, res) => {
  res.json({ message: 'TokTickIT API foundation running' })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TokTickIT API' })
})

export default app
