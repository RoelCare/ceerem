import { Hono } from 'hono';
import { join } from 'path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../db/index.js';
export const migrateRoutes = new Hono();
migrateRoutes.get('/', async (c) => {
    await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
    return c.json({ ok: true, message: 'Migrations applied successfully' });
});
