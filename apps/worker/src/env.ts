import { config } from 'dotenv'
import { z } from 'zod'

config({
  path: '../../.env',
})

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AWS_FILE_UPLOAD_S3_BUCKET_NAME: z.string().default(''),
  AWS_FILE_UPLOAD_S3_BUCKET_REGION: z.string().default(''),
  AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID: z.string().default(''),
  AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID: z.string().default(''),
  AWS_FILE_UPLOADS_SQS_QUEUE_URL: z.string().default(''),
})

export const env = envSchema.parse(process.env)
