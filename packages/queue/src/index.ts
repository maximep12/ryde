import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// General queues
export const QUEUE_PLACEHOLDER = 'queue_placeholder'
export const QUEUE_CLEANUP_STALE_DATA = 'queue_cleanup_stale_data'
export const QUEUE_REFRESH_MATERIALIZED_VIEWS = 'queue_refresh_materialized_views'
export const QUEUE_AWS_SQS_FILE_UPLOADS = 'queue_aws_sqs_file_uploads'

type GeneralQueue =
  | typeof QUEUE_PLACEHOLDER
  | typeof QUEUE_CLEANUP_STALE_DATA
  | typeof QUEUE_REFRESH_MATERIALIZED_VIEWS
  | typeof QUEUE_AWS_SQS_FILE_UPLOADS

// Processing files queues
export const QUEUE_S3_FILE_PROCESS_CLIENTS = 'queue_s3_file_process_clients'
export const QUEUE_S3_FILE_PROCESS_PRODUCTS = 'queue_s3_file_process_products'

export type ProcessingQueue =
  | typeof QUEUE_S3_FILE_PROCESS_CLIENTS
  | typeof QUEUE_S3_FILE_PROCESS_PRODUCTS

export type AllQueues = GeneralQueue | ProcessingQueue

export const getQueue = (queue: AllQueues, connection: IORedis) => new Queue(queue, { connection })
