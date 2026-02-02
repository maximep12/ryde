import { ENV, Environment, JOB_EVENT } from '@repo/constants'
import { FEATURE_FLAGS_ENV } from '@repo/feature-flags'
import { createBaseLogger } from '@repo/logger'
import {
  AllQueues,
  QUEUE_AWS_SQS_FILE_UPLOADS,
  QUEUE_CLEANUP_STALE_DATA,
  QUEUE_PLACEHOLDER,
  QUEUE_S3_FILE_PROCESS_CLIENTS,
  QUEUE_S3_FILE_PROCESS_PRODUCTS,
} from '@repo/queue'
import { Worker } from 'bullmq'
import { startSQSPoller } from './aws-sqs-poller'
import { createJobDbEntry } from './lib/utils/db'
import { logQueueHealth } from './lib/utils/logger'
import { startPollingServices } from './lib/utils/polling-services'
import { cleanupWorker } from './workers/cleanup/worker'
import { placeholderWorker } from './workers/placeholder/worker'
import {
  addClientsProcessingWorker,
  addProductsProcessingWorker,
} from './workers/uploads/processingWorkers'
import { routerWorker } from './workers/uploads/routerWorker'
// import { materializedViewsWorker } from './workers/materialized-views/worker'

const logger = createBaseLogger().child({
  module: 'worker',
})

logger.info({ cwd: process.cwd(), url: import.meta.url })

// Good CRON Time reference: https://crontab.guru/

const workers: { worker: Worker; setup: () => AllQueues }[] = [
  // Uncomment when materialized views worker is configured
  // {
  //   worker: materializedViewsWorker,
  //   setup: () => QUEUE_REFRESH_MATERIALIZED_VIEWS,
  // },
  {
    worker: cleanupWorker,
    setup: () => QUEUE_CLEANUP_STALE_DATA,
  },
  {
    worker: placeholderWorker,
    setup: () => QUEUE_PLACEHOLDER,
  },
  // Upload processing workers
  {
    worker: routerWorker,
    setup: () => QUEUE_AWS_SQS_FILE_UPLOADS,
  },
  {
    worker: addProductsProcessingWorker,
    setup: () => QUEUE_S3_FILE_PROCESS_PRODUCTS,
  },
  {
    worker: addClientsProcessingWorker,
    setup: () => QUEUE_S3_FILE_PROCESS_CLIENTS,
  },
]

workers.forEach(({ worker, setup }) => {
  worker.run()

  const queue = setup()

  const logger = createBaseLogger().child({
    module: 'worker',
    queue,
  })

  const jobStartTimes: Record<string, bigint> = {}

  worker.on('active', async (job) => {
    if (!job || !job.id) return

    jobStartTimes[job.id] = process.hrtime.bigint()

    await createJobDbEntry({
      jobId: job.id,
      jobName: job.name,
      event: JOB_EVENT.START,
      eventData: job.data,
    })

    logger.info(
      {
        job_id: job.id,
        job_name: job.name,
        job_date: job?.data,
      },
      'job start',
    )
  })

  worker.on('completed', async (job) => {
    if (!job || !job.id) return

    const end = process.hrtime.bigint()
    const start = jobStartTimes[job.id] || end // Fallback if start time is missing
    const duration = Number(end - start) / 1_000_000

    await createJobDbEntry({
      jobId: job.id,
      jobName: job.name,
      event: JOB_EVENT.COMPLETED,
      eventData: job.data,
    })

    logger.info(
      {
        job_id: job.id,
        job_name: job.name,
        job_data: job?.data,
        duration_ms: duration,
      },
      'job completed',
    )

    logQueueHealth(queue)
  })

  worker.on('failed', async (job, err) => {
    if (!job || !job.id) return

    await createJobDbEntry({
      jobId: job.id,
      jobName: job.name,
      event: JOB_EVENT.FAILED,
      eventData: job.data,
    })

    logger.error(
      {
        job_id: job?.id,
        job_name: job?.name,
        job_data: job?.data,
        error: err.message,
      },
      'job failed',
    )

    logQueueHealth(queue)
  })
})

process.on('SIGINT', async () => {
  for (const { worker } of workers) {
    await worker.close()
  }
  process.exit(0)
})

export { typedRedis } from './redis'

startPollingServices()

// Start AWS SQS poller for S3 upload events
const currentEnv = (process.env.ENV as Environment) || ENV.LOCAL
const isUploadEnabled = FEATURE_FLAGS_ENV[currentEnv]?.['upload-files'] ?? false
if (isUploadEnabled) {
  startSQSPoller()
}
