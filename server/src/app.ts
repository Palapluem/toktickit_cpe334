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

/*
 * Reference data (`api-spec.md` §2).
 *
 * Three rules apply to all three endpoints and are the reason each is written
 * out rather than shared behind a helper — a helper here would hide the
 * `select`, which is what keeps internal columns out of the response:
 *
 *   - the `{ data: [...] }` envelope every endpoint returns
 *   - `isActive` filtering, so a deactivated row disappears from the form
 *     without destroying the tickets that reference it (BR-10, BR-22)
 *   - explicit ordering by name; presentation order is a rule, not a property
 *     of the data, and insertion order is not a guarantee Postgres makes
 *     without an ORDER BY (§11.15)
 */

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
    // `isActive` is deliberately not selected: every row returned here is
    // active, so exposing the flag would invite the client to filter on it and
    // treat the selector as authorization. It is not (BR-03, BR-14).
    select: { id: true, displayName: true, email: true },
  })
  res.json({ data })
})

export default app
