import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { dbReadonly } from '../db/index.js'

const MAX_ROWS = 500

function prepareQuery(raw: string): { query: string } | { error: string } {
  const trimmed = raw.trim()

  if (!/^select[\s(]/i.test(trimmed)) {
    return { error: 'Only SELECT queries are allowed' }
  }

  const withoutTrailingSemicolon = trimmed.replace(/;\s*$/, '')
  if (withoutTrailingSemicolon.includes(';')) {
    return { error: 'Multiple statements are not allowed' }
  }

  const query = /\blimit\s+\d+/i.test(withoutTrailingSemicolon)
    ? withoutTrailingSemicolon
    : `${withoutTrailingSemicolon} LIMIT ${MAX_ROWS}`

  return { query }
}

export const databaseRoutes = new Hono()

databaseRoutes.post('/query', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const raw = body.query
  if (typeof raw !== 'string' || !raw.trim()) {
    return c.json({ error: 'Missing required field: query' }, 400)
  }

  const prepared = prepareQuery(raw)
  if ('error' in prepared) return c.json({ error: prepared.error }, 400)

  const rows = await dbReadonly.execute(sql.raw(prepared.query))
  return c.json({ rows, query: prepared.query })
})
