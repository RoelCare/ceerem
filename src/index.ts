import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { contactsMcp } from './mcp/contacts.js'
import { aiRoutes } from './routes/ai.js'
import { generateRoutes } from './routes/generate.js'
import { healthRoutes } from './routes/health.js'
import { onError, onNotFound } from './middleware/error.js'

const app = new Hono()

app.onError(onError)
app.notFound(onNotFound)

app.get('/', (c) => {
  return c.text('Hello Hono! 1')
})

app.route('/mcp/contacts', contactsMcp)
app.route('/ai', aiRoutes)
app.route('/generate', generateRoutes)
app.route('/health', healthRoutes)

const port = parseInt(process.env.PORT ?? '8080')

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
