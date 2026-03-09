import * as schema from '@repo/db'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from './lib/utils/env'

config({
  path: '../../.env',
})

export const db = drizzle(env.DATABASE_URL, { schema })
