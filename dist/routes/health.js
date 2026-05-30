import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
export const healthRoutes = new Hono();
healthRoutes.get('/', async (c) => {
    try {
        await db.execute(sql `SELECT 1`);
        return c.json({ ok: true, db: 'connected' });
    }
    catch (err) {
        const serialize = (e) => {
            if (!(e instanceof Error))
                return String(e);
            return { message: e.message, cause: e.cause ? serialize(e.cause) : undefined };
        };
        return c.json({ ok: false, db: 'unreachable', error: serialize(err) }, 500);
    }
});
