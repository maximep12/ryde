import { ENV, ENVIRONMENTS } from '@repo/constants'
import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: '../../.env',
})

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ENV: z.enum(ENVIRONMENTS).default(ENV.LOCAL),

  // S3 Upload (required for file upload functionality)
  AWS_FILE_UPLOAD_S3_BUCKET_NAME: z.string().default(''),
  AWS_FILE_UPLOAD_S3_BUCKET_REGION: z.string().default(''),
  AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID: z.string().default(''),
  AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID: z.string().default(''),
})

export type EnvVars = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)
