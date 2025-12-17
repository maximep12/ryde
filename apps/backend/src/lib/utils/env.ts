import { ENV, ENVIRONMENTS } from '@repo/constants'
import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: '../../.env',
})

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BACKEND_SENTRY_DSN: z.string().optional(),
  ENV: z.enum(ENVIRONMENTS).default(ENV.LOCAL),
})

export type EnvVars = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)
