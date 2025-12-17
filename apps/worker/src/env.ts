import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: '../../.env',
})

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
