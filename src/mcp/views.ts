import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { withWorkspace } from '../db/index.js'
import { views } from '../db/schema.js'
import { viewId } from '../db/id.js'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'ceerem-views', version: '1.0.0' }

const TOOLS = [
  {
    name: 'get_view',
    description: 'Retrieve a view by its ID or slug.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'Workspace ID' },
        organizationId: { type: 'string', description: 'Organization ID' },
        id: { type: 'string', description: 'View ID' },
      },
      required: ['workspaceId', 'organizationId'],
    },
  },
  {
    name: 'create_view',
    description: 'Create a new view containing a Vue component that can be dynamically loaded.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'Workspace ID' },
        organizationId: { type: 'string', description: 'Organization ID' },
        name: { type: 'string', description: 'Display name' },
        description: { type: 'string', description: 'Optional description' },
        source: { type: 'string', description: 'Vue SFC source code (.vue file contents)' },
        props: { type: 'object', description: 'JSON schema describing expected component props (optional)' },
        meta: { type: 'object', description: 'Arbitrary metadata (optional)' },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'draft'],
          description: 'View status (default: draft)',
        },
      },
      required: ['workspaceId', 'organizationId', 'name', 'source'],
    },
  },
  {
    name: 'update_view',
    description: 'Update an existing view by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'View ID' },
        workspaceId: { type: 'string', description: 'Workspace ID' },
        name: { type: 'string', description: 'Display name (optional)' },
        description: { type: 'string', description: 'Description (optional)' },
        source: { type: 'string', description: 'Vue SFC source code (optional)' },
        props: { type: 'object', description: 'Props schema (optional)' },
        meta: { type: 'object', description: 'Metadata (optional)' },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'draft'],
          description: 'View status (optional)',
        },
      },
      required: ['id', 'workspaceId'],
    },
  },
]

type ViewStatus = 'active' | 'inactive' | 'draft'

async function handleGetView(args: Record<string, unknown>) {
  const workspaceId = args.workspaceId as string
  const organizationId = args.organizationId as string
  const id = args.id as string | undefined

  if (!workspaceId || !organizationId) {
    return { error: { code: -32602, message: 'Missing required arguments: workspaceId, organizationId' } }
  }
  if (!id) {
    return { error: { code: -32602, message: 'Missing required argument: id' } }
  }

  const [view] = await withWorkspace(workspaceId, (conn) =>
    conn
      .select()
      .from(views)
      .where(and(eq(views.id, id), eq(views.organizationId, organizationId!)))
      .limit(1),
  )

  return {
    result: {
      content: [
        {
          type: 'text',
          text: view ? JSON.stringify(view, null, 2) : 'View not found.',
        },
      ],
    },
  }
}

async function handleCreateView(args: Record<string, unknown>) {
  const workspaceId = args.workspaceId as string
  const organizationId = args.organizationId as string
  const name = args.name as string
  const source = args.source as string

  if (!workspaceId || !organizationId || !name || !source) {
    return { error: { code: -32602, message: 'Missing required arguments: workspaceId, organizationId, name, source' } }
  }

  try {
    const [view] = await withWorkspace(workspaceId, (conn) =>
      conn
        .insert(views)
        .values({
          id: viewId(),
          workspaceId,
          organizationId,
          name,
          source,
          description: args.description as string | undefined,
          props: args.props ?? null,
          meta: args.meta ?? null,
          status: (args.status as ViewStatus | undefined) ?? 'draft',
        })
        .returning(),
    )

    return {
      result: {
        content: [{ type: 'text', text: JSON.stringify(view, null, 2) }],
      },
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('unique')) {
      return { error: { code: -32602, message: msg } }
    }
    throw err
  }
}

async function handleUpdateView(args: Record<string, unknown>) {
  const id = args.id as string
  if (!id) {
    return { error: { code: -32602, message: 'Missing required argument: id' } }
  }

  const patch: Partial<typeof views.$inferInsert> = {}
  if (args.name !== undefined) patch.name = args.name as string
  if (args.description !== undefined) patch.description = args.description as string
  if (args.source !== undefined) patch.source = args.source as string
  if (args.props !== undefined) patch.props = args.props
  if (args.meta !== undefined) patch.meta = args.meta
  if (args.status !== undefined) patch.status = args.status as ViewStatus
  patch.updatedAt = new Date()

  const workspaceId = args.workspaceId as string
  if (!workspaceId) {
    return { error: { code: -32602, message: 'Missing required argument: workspaceId' } }
  }

  const [view] = await withWorkspace(workspaceId, (conn) =>
    conn.update(views).set(patch).where(eq(views.id, id)).returning(),
  )

  return {
    result: {
      content: [
        {
          type: 'text',
          text: view ? JSON.stringify(view, null, 2) : 'View not found.',
        },
      ],
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

      if (name === 'get_view') {
        outcome = await handleGetView(args)
      } else if (name === 'create_view') {
        outcome = await handleCreateView(args)
      } else if (name === 'update_view') {
        outcome = await handleUpdateView(args)
      } else {
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }
      }

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

export const viewsMcp = new Hono()

viewsMcp.post('/', async (c) => {
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
