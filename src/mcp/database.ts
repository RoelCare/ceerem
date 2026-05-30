import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { dbReadonly } from '../db/index.js'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'ceerem-database', version: '1.0.0' }
const MAX_ROWS = 500

const TOOLS = [
  {
    name: 'query_database',
    description: `Execute a read-only SELECT query directly on the database. Results are capped at ${MAX_ROWS} rows unless you specify a lower LIMIT.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'A SELECT SQL statement to execute' },
      },
      required: ['query'],
    },
  },
]

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

async function handleQueryDatabase(args: Record<string, unknown>) {
  const raw = args.query as string
  if (!raw?.trim()) {
    return { error: { code: -32602, message: 'Missing required argument: query' } }
  }

  const prepared = prepareQuery(raw)
  if ('error' in prepared) {
    return { error: { code: -32602, message: prepared.error } }
  }

  const rows = await dbReadonly.execute(sql.raw(prepared.query))
  return {
    result: {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
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

      if (name !== 'query_database') {
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } }
      }

      const outcome = await handleQueryDatabase(args)
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

export const databaseMcp = new Hono()

databaseMcp.post('/', async (c) => {
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
