import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { views } from '../db/schema.js'
import { viewId } from '../db/id.js'

type ViewStatus = 'active' | 'inactive' | 'draft'

export const viewsRoutes = new Hono()

viewsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  const [view] = await db
    .select()
    .from(views)
    .where(eq(views.id, id))
    .limit(1)

  if (!view) return c.json({ error: 'View not found' }, 404)
  return c.json(view)
})

viewsRoutes.post('/', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { workspaceId, name, source } = body as Record<string, string>

  if (!workspaceId || !name || !source) {
    return c.json({ error: 'Missing required fields: workspaceId, name, source' }, 400)
  }

  const status = body.status as ViewStatus | undefined
  if (status && !['active', 'inactive', 'draft'].includes(status)) {
    return c.json({ error: 'status must be "active", "inactive", or "draft"' }, 400)
  }

  try {
    const [view] = await db
      .insert(views)
      .values({
        id: viewId(),
        workspaceId,
        organizationId: body.organizationId as string | undefined,
        name,
        source,
        description: body.description as string | undefined,
        props: body.props ?? null,
        meta: body.meta ?? null,
        status: status ?? 'draft',
      })
      .returning()

    return c.json(view, 201)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('unique')) {
      return c.json({ error: msg }, 409)
    }
    throw err
  }
})

viewsRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const status = body.status as ViewStatus | undefined
  if (status && !['active', 'inactive', 'draft'].includes(status)) {
    return c.json({ error: 'status must be "active", "inactive", or "draft"' }, 400)
  }

  const patch: Partial<typeof views.$inferInsert> = {}
  if (body.name !== undefined) patch.name = body.name as string
  if (body.description !== undefined) patch.description = body.description as string
  if (body.source !== undefined) patch.source = body.source as string
  if (body.props !== undefined) patch.props = body.props
  if (body.meta !== undefined) patch.meta = body.meta
  if (status !== undefined) patch.status = status
  patch.updatedAt = new Date()

  const [view] = await db
    .update(views)
    .set(patch)
    .where(eq(views.id, id))
    .returning()

  if (!view) return c.json({ error: 'View not found' }, 404)
  return c.json(view)
})
