import { Hono } from 'hono';
import { or, ilike, eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contacts } from '../db/schema.js';
import { contactId } from '../db/id.js';
export const contactsRoutes = new Hono();
contactsRoutes.get('/', async (c) => {
    const query = c.req.query('query');
    const status = c.req.query('status');
    const limitParam = c.req.query('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (!query) {
        return c.json({ error: 'Missing required query parameter: query' }, 400);
    }
    if (status && status !== 'active' && status !== 'inactive') {
        return c.json({ error: 'status must be "active" or "inactive"' }, 400);
    }
    const q = `%${query}%`;
    const results = await db
        .select()
        .from(contacts)
        .where(and(or(ilike(contacts.name, q), ilike(contacts.email, q), ilike(contacts.city, q)), status ? eq(contacts.status, status) : undefined))
        .limit(limit);
    return c.json(results);
});
contactsRoutes.post('/', async (c) => {
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const { workspaceId, name } = body;
    if (!workspaceId || !name) {
        return c.json({ error: 'Missing required fields: workspaceId, name' }, 400);
    }
    const status = body.status;
    if (status && status !== 'active' && status !== 'inactive') {
        return c.json({ error: 'status must be "active" or "inactive"' }, 400);
    }
    try {
        const [contact] = await db
            .insert(contacts)
            .values({
            id: contactId(),
            workspaceId,
            organizationId: body.organizationId,
            name,
            email: body.email,
            phone: body.phone,
            street: body.street,
            streetNumber: body.streetNumber,
            zipcode: body.zipcode,
            city: body.city,
            state: body.state,
            country: body.country,
            status: status ?? 'active',
        })
            .returning();
        return c.json(contact, 201);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('unique')) {
            return c.json({ error: msg }, 409);
        }
        throw err;
    }
});
