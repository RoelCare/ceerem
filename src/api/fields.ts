import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { fields } from '../db/schema.js'
import { fieldId } from '../db/id.js'

type FieldType =
  | 'text' | 'email' | 'number' | 'tel' | 'url' | 'password'
  | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'hidden'

const VALID_TYPES: FieldType[] = [
  'text', 'email', 'number', 'tel', 'url', 'password',
  'textarea', 'select', 'radio', 'checkbox', 'date', 'file', 'hidden',
]

const FIELD_COLUMNS = Object.keys(fields).filter((k) => k !== 'meta')

export const fieldsRoutes = new Hono()

fieldsRoutes.get('/schema', (c) => {
  return c.json({ columns: FIELD_COLUMNS })
})

fieldsRoutes.get('/', async (c) => {
  const workspaceId = c.req.query('workspaceId')
  if (!workspaceId) return c.json({ error: 'Missing required query parameter: workspaceId' }, 400)

  const results = await db
    .select()
    .from(fields)
    .where(eq(fields.workspaceId, workspaceId))
    .orderBy(fields.order)

  return c.json(results)
})

fieldsRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  const [field] = await db.select().from(fields).where(eq(fields.id, id)).limit(1)
  if (!field) return c.json({ error: 'Field not found' }, 404)
  return c.json(field)
})

fieldsRoutes.post('/', async (c) => {
  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { workspaceId, name, type } = body as Record<string, string>
  if (!workspaceId || !name || !type) {
    return c.json({ error: 'Missing required fields: workspaceId, name, type' }, 400)
  }
  if (!VALID_TYPES.includes(type as FieldType)) {
    return c.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, 400)
  }

  const [field] = await db
    .insert(fields)
    .values({
      id: fieldId(),
      workspaceId,
      name,
      type: type as FieldType,
      label: body.label as string | undefined,
      placeholder: body.placeholder as string | undefined,
      class: body.class as string | undefined,
      defaultValue: body.defaultValue as string | undefined,
      helpText: body.helpText as string | undefined,
      required: (body.required as boolean | undefined) ?? false,
      disabled: (body.disabled as boolean | undefined) ?? false,
      readonly: (body.readonly as boolean | undefined) ?? false,
      pattern: body.pattern as string | undefined,
      min: body.min as string | undefined,
      max: body.max as string | undefined,
      minLength: body.minLength as number | undefined,
      maxLength: body.maxLength as number | undefined,
      options: body.options ?? null,
      order: (body.order as number | undefined) ?? 0,
      meta: body.meta ?? null,
    })
    .returning()

  return c.json(field, 201)
})

fieldsRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const type = body.type as FieldType | undefined
  if (type && !VALID_TYPES.includes(type)) {
    return c.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, 400)
  }

  const patch: Partial<typeof fields.$inferInsert> = {}
  if (body.name !== undefined) patch.name = body.name as string
  if (body.label !== undefined) patch.label = body.label as string
  if (type !== undefined) patch.type = type
  if (body.placeholder !== undefined) patch.placeholder = body.placeholder as string
  if (body.class !== undefined) patch.class = body.class as string
  if (body.defaultValue !== undefined) patch.defaultValue = body.defaultValue as string
  if (body.helpText !== undefined) patch.helpText = body.helpText as string
  if (body.required !== undefined) patch.required = body.required as boolean
  if (body.disabled !== undefined) patch.disabled = body.disabled as boolean
  if (body.readonly !== undefined) patch.readonly = body.readonly as boolean
  if (body.pattern !== undefined) patch.pattern = body.pattern as string
  if (body.min !== undefined) patch.min = body.min as string
  if (body.max !== undefined) patch.max = body.max as string
  if (body.minLength !== undefined) patch.minLength = body.minLength as number
  if (body.maxLength !== undefined) patch.maxLength = body.maxLength as number
  if (body.options !== undefined) patch.options = body.options
  if (body.order !== undefined) patch.order = body.order as number
  if (body.meta !== undefined) patch.meta = body.meta
  patch.updatedAt = new Date()

  const [field] = await db.update(fields).set(patch).where(eq(fields.id, id)).returning()
  if (!field) return c.json({ error: 'Field not found' }, 404)
  return c.json(field)
})

fieldsRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const [field] = await db.delete(fields).where(eq(fields.id, id)).returning()
  if (!field) return c.json({ error: 'Field not found' }, 404)
  return c.body(null, 204)
})
