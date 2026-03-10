import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: '../../.env',
})

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('8h'),
  // Static tokens for /token endpoint
  ADMIN_TOKEN: z.string().default(''),
  TRADE_TOKEN: z.string().default(''),
  RABBA_TOKEN: z.string().default(''),
  CIRCLE_K_TOKEN: z.string().default(''),
  // S3
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_CIRCLEK_BUCKET_NAME: z.string().default(''),
  S3_CIRCLEK_REGION: z.string().default(''),
  S3_RABBA_BUCKET_NAME: z.string().default(''),
  S3_GLOBAL_NAME: z.string().default(''),
  S3_REGION: z.string().default(''),
  // Slack
  SLACK_TOKEN: z.string().default(''),
  // SFTP
  SFTP_CONNECTION_STRING: z.string().default(''),
  RABBA_SFTP_CONTAINER: z.string().default(''),
  // Azure
  AZURE_STORAGE_CONNECTION_STRING: z.string().default(''),
  // Metabase
  METABASE_SECRET_KEY: z.string().default(''),
  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  // Advance DB (external)
  ADVANCE_DATABASE_URL: z.string().default(''),
  // App
  NODE_ENV: z.enum(['development', 'qa', 'production']).default('development'),
  PORT: z.coerce.number().default(5001),
})

export type EnvVars = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)
