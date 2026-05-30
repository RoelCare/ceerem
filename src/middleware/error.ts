import type { ErrorHandler, NotFoundHandler } from 'hono'

export const onError: ErrorHandler = (err, c) => {
  console.error(`[error] ${c.req.method} ${c.req.path}`, err)

  if (c.req.path.startsWith('/mcp/')) {
    return c.json(
      { jsonrpc: '2.0', id: null, error: { code: -32603, message: err.message || 'Internal error' } },
      500,
    )
  }

  return c.json({ error: { status: 500, message: err.message || 'Internal server error' } }, 500)
}

export const onNotFound: NotFoundHandler = (c) => {
  return c.json({ error: { status: 404, message: `No route: ${c.req.method} ${c.req.path}` } }, 404)
}
