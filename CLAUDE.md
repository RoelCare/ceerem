# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ceerem (pronounced "Cee Rem") is an AI-powered CRM platform. Its differentiator: it has only AI employees, and charges customers per usage (tokens/requests) rather than per seat.

## Commands

```bash
npm run dev      # Start dev server with hot reload (tsx watch)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output from dist/
```

Dev server runs on http://localhost:3000.

No test runner is configured yet.

## Stack

- **Runtime:** Node.js (ESM, `"type": "module"`)
- **Framework:** Hono v4 with `@hono/node-server` adapter
- **Language:** TypeScript (strict mode, ESNext target, NodeNext modules)
- **JSX:** Hono's JSX renderer (`hono/jsx`) — configured in tsconfig

## Architecture

Currently a single entrypoint at [src/index.ts](src/index.ts) that creates a Hono app and starts the Node server. The project is in early stages — no routing structure, middleware, or services have been established yet.

When building out the platform, Hono's pattern is to compose sub-apps or use `app.route()` to mount feature routers:

```ts
import { Hono } from 'hono'
const contacts = new Hono()
contacts.get('/', ...)
app.route('/contacts', contacts)
```
