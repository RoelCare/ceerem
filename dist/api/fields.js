import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { fields } from '../db/schema.js';
import { fieldId } from '../db/id.js';
const VALID_TYPES = [
    'text', 'email', 'number', 'tel', 'url', 'password',
    'textarea', 'select', 'radio', 'checkbox', 'date', 'file', 'hidden',
];
const FIELD_COLUMNS = Object.keys(fields).filter((k) => k !== 'meta');
export const fieldsRoutes = new Hono();
fieldsRoutes.get('/schema', (c) => {
    return c.json({ columns: FIELD_COLUMNS });
});
fieldsRoutes.get('/', async (c) => {
    const workspaceId = c.req.query('workspaceId');
    if (!workspaceId)
        return c.json({ error: 'Missing required query parameter: workspaceId' }, 400);
    const results = await db
        .select()
        .from(fields)
        .where(eq(fields.workspaceId, workspaceId))
        .orderBy(fields.order);
    return c.json(results);
});
fieldsRoutes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const [field] = await db.select().from(fields).where(eq(fields.id, id)).limit(1);
    if (!field)
        return c.json({ error: 'Field not found' }, 404);
    return c.json(field);
});
fieldsRoutes.post('/', async (c) => {
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const { workspaceId, name, type } = body;
    if (!workspaceId || !name || !type) {
        return c.json({ error: 'Missing required fields: workspaceId, name, type' }, 400);
    }
    if (!VALID_TYPES.includes(type)) {
        return c.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, 400);
    }
    const [field] = await db
        .insert(fields)
        .values({
        id: fieldId(),
        workspaceId,
        name,
        type: type,
        label: body.label,
        placeholder: body.placeholder,
        class: body.class,
        defaultValue: body.defaultValue,
        helpText: body.helpText,
        required: body.required ?? false,
        disabled: body.disabled ?? false,
        readonly: body.readonly ?? false,
        pattern: body.pattern,
        min: body.min,
        max: body.max,
        minLength: body.minLength,
        maxLength: body.maxLength,
        options: body.options ?? null,
        order: body.order ?? 0,
        meta: body.meta ?? null,
    })
        .returning();
    return c.json(field, 201);
});
fieldsRoutes.patch('/:id', async (c) => {
    const id = c.req.param('id');
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const type = body.type;
    if (type && !VALID_TYPES.includes(type)) {
        return c.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, 400);
    }
    const patch = {};
    if (body.name !== undefined)
        patch.name = body.name;
    if (body.label !== undefined)
        patch.label = body.label;
    if (type !== undefined)
        patch.type = type;
    if (body.placeholder !== undefined)
        patch.placeholder = body.placeholder;
    if (body.class !== undefined)
        patch.class = body.class;
    if (body.defaultValue !== undefined)
        patch.defaultValue = body.defaultValue;
    if (body.helpText !== undefined)
        patch.helpText = body.helpText;
    if (body.required !== undefined)
        patch.required = body.required;
    if (body.disabled !== undefined)
        patch.disabled = body.disabled;
    if (body.readonly !== undefined)
        patch.readonly = body.readonly;
    if (body.pattern !== undefined)
        patch.pattern = body.pattern;
    if (body.min !== undefined)
        patch.min = body.min;
    if (body.max !== undefined)
        patch.max = body.max;
    if (body.minLength !== undefined)
        patch.minLength = body.minLength;
    if (body.maxLength !== undefined)
        patch.maxLength = body.maxLength;
    if (body.options !== undefined)
        patch.options = body.options;
    if (body.order !== undefined)
        patch.order = body.order;
    if (body.meta !== undefined)
        patch.meta = body.meta;
    patch.updatedAt = new Date();
    const [field] = await db.update(fields).set(patch).where(eq(fields.id, id)).returning();
    if (!field)
        return c.json({ error: 'Field not found' }, 404);
    return c.json(field);
});
fieldsRoutes.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const [field] = await db.delete(fields).where(eq(fields.id, id)).returning();
    if (!field)
        return c.json({ error: 'Field not found' }, 404);
    return c.body(null, 204);
});
