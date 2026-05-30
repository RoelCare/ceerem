import { jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const contactStatusEnum = pgEnum('contact_status', ['active', 'inactive'])

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  organizationId: text('organization_id').notNull(),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  street: text('street'),
  streetNumber: text('street_number'),
  zipcode: text('zipcode'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  status: contactStatusEnum('status').default('active').notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
