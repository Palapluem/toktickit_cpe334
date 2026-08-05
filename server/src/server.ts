import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

app.listen(PORT, () => {
  console.log(`TokTickIT API listening on http://localhost:${PORT}`)
})
