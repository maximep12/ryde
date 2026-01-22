import { UploadType, uploadTypesSchema } from '@repo/csv'
import { createBaseLogger } from '@repo/logger'
import {
  getQueue,
  ProcessingQueue,
  QUEUE_AWS_SQS_FILE_UPLOADS,
  QUEUE_S3_FILE_PROCESS_CLIENTS,
  QUEUE_S3_FILE_PROCESS_PRODUCTS,
} from '@repo/queue'
import { Worker } from 'bullmq'
import { WORKER_DEFAULT_OPTIONS } from '../../lib/utils/options'
import { connection } from '../../redis'
import { getUploadToS3Log } from './helpers/uploads'

const PROCESSING_QUEUES_MAP: Record<UploadType, ProcessingQueue> = {
  'products': QUEUE_S3_FILE_PROCESS_PRODUCTS,
  'clients': QUEUE_S3_FILE_PROCESS_CLIENTS,
} as const

const logger = createBaseLogger().child({
  module: 'worker',
  queue: QUEUE_AWS_SQS_FILE_UPLOADS,
})

export const routerWorker = new Worker(
  QUEUE_AWS_SQS_FILE_UPLOADS,
  async (job) => {
    const { s3 } = job.data

    const [upload] = await getUploadToS3Log(s3.object.key)
    if (!upload) {
      logger.error({ key: s3.object.key }, 'Upload to S3 log not found')
      return
    }

    const uploadType = uploadTypesSchema.parse(upload.type)

    const processingQueue = PROCESSING_QUEUES_MAP[uploadType]
    if (processingQueue) {
      logger.info({ processingQueue }, 'Add job for processing queue...')

      const queue = getQueue(processingQueue, connection)
      await queue.add(`${uploadType}-${upload.uuid}`, { upload })
    }
  },
  WORKER_DEFAULT_OPTIONS,
)
