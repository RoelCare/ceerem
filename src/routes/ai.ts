import { Hono } from 'hono'
import { claude, MODEL } from '../lib/claude.js'

export const aiRoutes = new Hono()

aiRoutes.get('/chat', async (c) => {
  const message = c.req.query('message')

  if (!message) {
    return c.json({ error: 'message query parameter is required' }, 400)
  }

  const response = await claude.messages.create({
    model: MODEL,
    max_tokens: 1024,
    // System prompt cached — stable content goes first with cache_control
    system: [
      {
        type: 'text',
        text: 'You are a helpful AI assistant for Ceerem, an AI-powered CRM platform. Help users manage their contacts, deals, and customer relationships effectively.',
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: message }],
  })

  const text = response.content.find((b) => b.type === 'text')?.text ?? ''

  return c.json({
    response: text,
    usage: response.usage,
  })
})
