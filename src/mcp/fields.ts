import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { fields } from '../db/schema.js'
import { fieldId } from '../db/id.js'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'ceerem-fields', version: '1.0.0' }

const FIELD_TYPES = [
  'text', 'email', 'number', 'tel', 'url', 'password',
  'textarea', 'select', 'radio', 'checkbox', 'date', 'file', 'hidden',
]

const FIELD_COLUMNS = Object.keys(fields).filter((k) => k !== 'meta')

const TOOLS = [
  {
    name: 'list_field_columns',
    description: 'List all available column names on the fields table (excludes meta).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_fields',
    description: 'List all field definitions for a workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'Workspace ID' },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'get_field',
    description: 'Retrieve a field definition by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Field ID (fld_ prefix)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_field',
    description: 'Create a new form field definition.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'Workspace ID' },
        name: { type: 'string', description: 'HTML name attribute' },
        type: { type: 'string', enum: FIELD_TYPES, description: 'Input type' },
        label: { type: 'string', description: 'Visible label text' },
        placeholder: { type: 'string', description: 'Placeholder text' },
        class: { type: 'string', description: 'CSS classes' },
        defaultValue: { type: 'string', description: 'Pre-filled value' },
        helpText: { type: 'string', description: 'Hint shown below the field' },
        required: { type: 'boolean', description: 'Whether the field is required' },
        disabled: { type: 'boolean', description: 'Whether the field is disabled' },
        readonly: { type: 'boolean', description: 'Whether the field is read-only' },
        pattern: { type: 'string', description: 'Validation regex (HTML pattern attribute)' },
        min: { type: 'string', description: 'Minimum value (number or date)' },
        max: { type: 'string', description: 'Maximum value (number or date)' },
        minLength: { type: 'integer', description: 'Minimum character length' },
        maxLength: { type: 'integer', description: 'Maximum character length' },
        options: {
          type: 'array',
          description: 'Options for select/radio/checkbox fields',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
            },
          },
        },
        order: { type: 'integer', description: 'Display order (default: 0)' },
        meta: { type: 'object', description: 'Arbitrary metadata' },
      },
      required: ['workspaceId', 'name', 'type'],
    },
  },
  {
    name: 'update_field',
    description: 'Update an existing field definition by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Field ID' },
        name: { type: 'string' },
        type: { type: 'string', enum: FIELD_TYPES },
        label: { type: 'string' },
        placeholder: { type: 'string' },
        class: { type: 'string' },
        defaultValue: { type: 'string' },
        helpText: { type: 'string' },
        required: { type: 'boolean' },
        disabled: { type: 'boolean' },
        readonly: { type: 'boolean' },
        pattern: { type: 'string' },
        min: { type: 'string' },
        max: { type: 'string' },
        minLength: { type: 'integer' },
        maxLength: { type: 'integer' },
        options: { type: 'array' },
        order: { type: 'integer' },
        meta: { type: 'object' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_field',
    description: 'Delete a field definition by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Field ID' },
      },
      required: ['id'],
    },
  },
]

type FieldType =
  | 'text' | 'email' | 'number' | 'tel' | 'url' | 'password'
  | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'hidden'

function handleListFieldColumns() {
  return { result: { content: [{ type: 'text', text: JSON.stringify(FIELD_COLUMNS, null, 2) }] } }
}

async function handleListFields(args: Record<string, unknown>) {
  const workspaceId = args.workspaceId as string
  if (!workspaceId) {
    return { error: { code: -32602, message: 'Missing required argument: workspaceId' } }
  }

  const results = await db
    .select()
    .from(fields)
    .where(eq(fields.workspaceId, workspaceId))
    .orderBy(fields.order)

  return { result: { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] } }
}

async function handleGetField(args: Record<string, unknown>) {
  const id = args.id as string
  if (!id) return { error: { code: -32602, message: 'Missing required argument: id' } }

  const [field] = await db.select().from(fields).where(eq(fields.id, id)).limit(1)
  return {
    result: {
      content: [{ type: 'text', text: field ? JSON.stringify(field, null, 2) : 'Field not found.' }],
    },
  }
}

async function handleCreateField(args: Record<string, unknown>) {
  const workspaceId = args.workspaceId as string
  const name = args.name as string
  const type = args.type as string

  if (!workspaceId || !name || !type) {
    return { error: { code: -32602, message: 'Missing required arguments: workspaceId, name, type' } }
  }
  if (!FIELD_TYPES.includes(type)) {
    return { error: { code: -32602, message: `type must be one of: ${FIELD_TYPES.join(', ')}` } }
  }

  const [field] = await db
    .insert(fields)
    .values({
      id: fieldId(),
      workspaceId,
      name,
      type: type as FieldType,
      label: args.label as string | undefined,
      placeholder: args.placeholder as string | undefined,
      class: args.class as string | undefined,
      defaultValue: args.defaultValue as string | undefined,
      helpText: args.helpText as string | undefined,
      required: (args.required as boolean | undefined) ?? false,
      disabled: (args.disabled as boolean | undefined) ?? false,
      readonly: (args.readonly as boolean | undefined) ?? false,
      pattern: args.pattern as string | undefined,
      min: args.min as string | undefined,
      max: args.max as string | undefined,
      minLength: args.minLength as number | undefined,
      maxLength: args.maxLength as number | undefined,
      options: args.options ?? null,
      order: (args.order as number | undefined) ?? 0,
      meta: args.meta ?? null,
    })
    .returning()

  return { result: { content: [{ type: 'text', text: JSON.stringify(field, null, 2) }] } }
}

async function handleUpdateField(args: Record<string, unknown>) {
  const id = args.id as string
  if (!id) return { error: { code: -32602, message: 'Missing required argument: id' } }

  const type = args.type as FieldType | undefined
  if (type && !FIELD_TYPES.includes(type)) {
    return { error: { code: -32602, message: `type must be one of: ${FIELD_TYPES.join(', ')}` } }
  }

  const patch: Partial<typeof fields.$inferInsert> = {}
  if (args.name !== undefined) patch.name = args.name as string
  if (args.label !== undefined) patch.label = args.label as string
  if (type !== undefined) patch.type = type
  if (args.placeholder !== undefined) patch.placeholder = args.placeholder as string
  if (args.class !== undefined) patch.class = args.class as string
  if (args.defaultValue !== undefined) patch.defaultValue = args.defaultValue as string
  if (args.helpText !== undefined) patch.helpText = args.helpText as string
  if (args.required !== undefined) patch.required = args.required as boolean
  if (args.disabled !== undefined) patch.disabled = args.disabled as boolean
  if (args.readonly !== undefined) patch.readonly = args.readonly as boolean
  if (args.pattern !== undefined) patch.pattern = args.pattern as string
  if (args.min !== undefined) patch.min = args.min as string
  if (args.max !== undefined) patch.max = args.max as string
  if (args.minLength !== undefined) patch.minLength = args.minLength as number
  if (args.maxLength !== undefined) patch.maxLength = args.maxLength as number
  if (args.options !== undefined) patch.options = args.options
  if (args.order !== undefined) patch.order = args.order as number
  if (args.meta !== undefined) patch.meta = args.meta
  patch.updatedAt = new Date()

  const [field] = await db.update(fields).set(patch).where(eq(fields.id, id)).returning()
  return {
    result: {
      content: [{ type: 'text', text: field ? JSON.stringify(field, null, 2) : 'Field not found.' }],
    },
  }
}

async function handleDeleteField(args: Record<string, unknown>) {
  const id = args.id as string
  if (!id) return { error: { code: -32602, message: 'Missing required argument: id' } }

  const [field] = await db.delete(fields).where(eq(fields.id, id)).returning()
  return {
    result: {
      content: [{ type: 'text', text: field ? `Field ${id} deleted.` : 'Field not found.' }],
    },
  }
}

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: string | number
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id?: string | number | null
  result?: unknown
  error?: { code: number; message: string }
}

async function handleMessage(msg: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      }

    case 'notifications/initialized':
      return null

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } }

    case 'tools/call': {
      const { name, arguments: args = {} } = params as {
        name: string
        arguments: Record<string, unknown>
      }

      let outcome: { result?: unknown; error?: { code: number; message: string } }

      if (name === 'list_field_columns') outcome = handleListFieldColumns()
      else if (name === 'list_fields') outcome = await handleListFields(args)
      else if (name === 'get_field') outcome = await handleGetField(args)
      else if (name === 'create_field') outcome = await handleCreateField(args)
      else if (name === 'update_field') outcome = await handleUpdateField(args)
      else if (name === 'delete_field') outcome = await handleDeleteField(args)
      else return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }

      if (outcome.error) return { jsonrpc: '2.0', id, error: outcome.error }
      return { jsonrpc: '2.0', id, result: outcome.result }
    }

    default:
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32601, message: `Method not found: ${method}` },
      }
  }
}

export const fieldsMcp = new Hono()

fieldsMcp.post('/', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400)
  }

  if (Array.isArray(body)) {
    const responses = (await Promise.all((body as JsonRpcRequest[]).map(handleMessage))).filter((r) => r !== null)
    return c.json(responses)
  }

  const response = await handleMessage(body as JsonRpcRequest)
  if (response === null) return c.body(null, 204)
  return c.json(response)
})
