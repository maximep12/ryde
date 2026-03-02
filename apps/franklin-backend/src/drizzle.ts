import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { env } from './lib/utils/env'

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
