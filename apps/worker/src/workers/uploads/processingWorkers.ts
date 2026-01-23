import { S3Client } from '@aws-sdk/client-s3'
import { clientsSchema, productsSchema } from '@repo/csv'
import { QUEUE_S3_FILE_PROCESS_CLIENTS, QUEUE_S3_FILE_PROCESS_PRODUCTS } from '@repo/queue'
import { env } from '../../env'
import { batchInsertClients, batchValidateClients } from './helpers/addClients'
import { batchInsertProducts, batchValidateProducts } from './helpers/addProducts'
import { getBatchProcessingWorker } from './helpers/workers'

const s3 = new S3Client({
  region: env.AWS_FILE_UPLOAD_S3_BUCKET_REGION,
  credentials: {
    accessKeyId: env.AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID,
  },
})

export const addProductsProcessingWorker = getBatchProcessingWorker(
  s3,
  QUEUE_S3_FILE_PROCESS_PRODUCTS,
  productsSchema,
  batchValidateProducts,
  batchInsertProducts,
)

export const addClientsProcessingWorker = getBatchProcessingWorker(
  s3,
  QUEUE_S3_FILE_PROCESS_CLIENTS,
  clientsSchema,
  batchValidateClients,
  batchInsertClients,
)
