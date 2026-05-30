import 'dotenv/config'
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST,
    port: 5432,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD || undefined,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL !== 'disable'
  }
} satisfies Config
