import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { contactsMcp } from './mcp/contacts.js'
import { viewsMcp } from './mcp/views.js'
import { fieldsMcp } from './mcp/fields.js'
import { databaseMcp } from './mcp/database.js'
import { contactsRoutes } from './api/contacts.js'
import { viewsRoutes } from './api/views.js'
import { fieldsRoutes } from './api/fields.js'
import { databaseRoutes } from './api/database.js'
import { aiRoutes } from './api/ai.js'
import { generateRoutes } from './api/generate.js'
import { healthRoutes } from './api/health.js'
import { onError, onNotFound } from './middleware/error.js'

const app = new Hono()

app.onError(onError)
app.notFound(onNotFound)

app.get('/', (c) => {
  return c.text('Hello Hono! 1')
})

app.route('/mcp/contacts', contactsMcp)
app.route('/api/contacts', contactsRoutes)
app.route('/api/views', viewsRoutes)
app.route('/mcp/views', viewsMcp)
app.route('/api/fields', fieldsRoutes)
app.route('/api/database', databaseRoutes)
app.route('/mcp/fields', fieldsMcp)
app.route('/mcp/database', databaseMcp)
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
