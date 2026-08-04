import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

// Minimal placeholder proving the server starts (Issue 1 scope only).
// /api/health and /api/categories are implemented in Issue 2 and Issue 4.
app.get('/', (_req, res) => {
  res.json({ message: 'TokTickIT API foundation running' })
})

export default app
