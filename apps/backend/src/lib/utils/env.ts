import { ENV, ENVIRONMENTS, Environment } from '@repo/constants'
import { FEATURE_FLAGS_ENV } from '@repo/feature-flags'
import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: '../../.env',
})

const currentEnv = (process.env.ENV as Environment) || ENV.LOCAL
const isUploadEnabled = FEATURE_FLAGS_ENV[currentEnv]?.['upload-files'] ?? false

const baseSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  ENV: z.enum(ENVIRONMENTS).default(ENV.LOCAL),
})

const uploadFields = {
  AWS_FILE_UPLOAD_S3_BUCKET_NAME: z.string().default(''),
  AWS_FILE_UPLOAD_S3_BUCKET_REGION: z.string().default(''),
  AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID: z.string().default(''),
  AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID: z.string().default(''),
}

const fullSchema = baseSchema.extend(uploadFields)

const envSchema = isUploadEnabled ? fullSchema : baseSchema

export type EnvVars = z.infer<typeof fullSchema>

export const env = envSchema.parse(process.env) as EnvVars
