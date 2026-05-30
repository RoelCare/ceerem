import { Hono } from 'hono'
import { or, ilike, eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { contacts } from '../db/schema.js'
import { contactId } from '../db/id.js'

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'ceerem-contacts', version: '1.0.0' }

const TOOLS = [
  {
    name: 'search_contacts',
    description: 'Search contacts by name, email, or company. Returns matching contacts from the CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search string matched against first name, last name, email, and company',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Filter by contact status (optional)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_contact',
    description: 'Add a new contact to the CRM database.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: { type: 'string', description: 'Workspace ID' },
        organizationId: { type: 'string', description: 'Organization ID' },
        name: { type: 'string', description: 'Full name' },
        email: { type: 'string', description: 'Email address (optional)' },
        phone: { type: 'string', description: 'Phone number (optional)' },
        street: { type: 'string', description: 'Street name (optional)' },
        streetNumber: { type: 'string', description: 'Street number (optional)' },
        zipcode: { type: 'string', description: 'Zip code (optional)' },
        city: { type: 'string', description: 'City (optional)' },
        state: { type: 'string', description: 'State or province (optional)' },
        country: { type: 'string', description: 'Country (optional)' },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Contact status (default: active)',
        },
      },
      required: ['workspaceId', 'organizationId', 'name'],
    },
  },
]

type Status = 'active' | 'inactive'

async function handleSearchContacts(args: Record<string, unknown>) {
  const query = args.query as string
  const status = args.status as Status | undefined
  const limit = typeof args.limit === 'number' ? args.limit : 10

  if (!query) return { error: { code: -32602, message: 'Missing required argument: query' } }

  const q = `%${query}%`
  const results = await db
    .select()
    .from(contacts)
    .where(
      and(
        or(
          ilike(contacts.name, q),
          ilike(contacts.email, q),
          ilike(contacts.city, q),
        ),
        status ? eq(contacts.status, status) : undefined,
      ),
    )
    .limit(limit)

  return {
    result: {
      content: [
        {
          type: 'text',
          text: results.length > 0 ? JSON.stringify(results, null, 2) : 'No contacts found matching the query.',
        },
      ],
    },
  }
}

async function handleAddContact(args: Record<string, unknown>) {
  const name = args.name as string
  const workspaceId = args.workspaceId as string
  const organizationId = args.organizationId as string

  if (!name || !workspaceId || !organizationId) {
    return { error: { code: -32602, message: 'Missing required arguments: workspaceId, organizationId, name' } }
  }

  const id = contactId()

  try {
    const [contact] = await db
      .insert(contacts)
      .values({
        id,
        workspaceId,
        organizationId,
        name,
        email: args.email as string | undefined,
        phone: args.phone as string | undefined,
        street: args.street as string | undefined,
        streetNumber: args.streetNumber as string | undefined,
        zipcode: args.zipcode as string | undefined,
        city: args.city as string | undefined,
        state: args.state as string | undefined,
        country: args.country as string | undefined,
        status: (args.status as Status | undefined) ?? 'active',
      })
      .returning()

    return {
      result: {
        content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }],
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

      if (name === 'search_contacts') {
        outcome = await handleSearchContacts(args)
      } else if (name === 'add_contact') {
        outcome = await handleAddContact(args)
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

export const contactsMcp = new Hono()

contactsMcp.post('/', async (c) => {
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
