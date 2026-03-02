import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({
  path: '../../.env',
})

export default defineConfig({
  out: './drizzle-local',
  schema: './src/schema/index.ts',
  dialect: 'postgresql',
  casing: 'camelCase',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    prefix: 'timestamp',
  },
})
