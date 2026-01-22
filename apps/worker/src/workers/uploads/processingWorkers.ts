import { S3Client } from '@aws-sdk/client-s3'
import { clientsSchema, productsSchema } from '@repo/csv'
import { QUEUE_S3_FILE_PROCESS_CLIENTS, QUEUE_S3_FILE_PROCESS_PRODUCTS } from '@repo/queue'
import { env } from '../../env'
import { processAddClientsRecord, validateAddClientsRecord } from './helpers/addClients'
import { processAddProductsRecord, validateAddProductsRecord } from './helpers/addProducts'
import { getProcessingWorker } from './helpers/workers'

const s3 = new S3Client({
  region: env.AWS_FILE_UPLOAD_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: env.AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID,
  },
})

export const addProductsProcessingWorker = getProcessingWorker(
  s3,
  QUEUE_S3_FILE_PROCESS_PRODUCTS,
  productsSchema,
  async (record) => {
    const validation = await validateAddProductsRecord(record)
    return validation
  },
  async (record) => {
    const processed = await processAddProductsRecord(record)
    return processed
  },
)

export const addClientsProcessingWorker = getProcessingWorker(
  s3,
  QUEUE_S3_FILE_PROCESS_CLIENTS,
  clientsSchema,
  async (record) => {
    const validation = await validateAddClientsRecord(record)
    return validation
  },
  async (record) => {
    const processed = await processAddClientsRecord(record)
    return processed
  },
)
