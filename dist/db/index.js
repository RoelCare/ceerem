import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';
const client = postgres({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
});
export const db = drizzle(client, { schema });
export async function withWorkspace(workspaceId, fn) {
    return db.transaction(async (tx) => {
        await tx.execute(sql `SELECT set_config('app.workspace_id', ${workspaceId}, true)`);
        return fn(tx);
    });
}
const readClient = postgres({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_READ_USER,
    password: process.env.DATABASE_READ_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
});
export const dbReadonly = drizzle(readClient, { schema });
