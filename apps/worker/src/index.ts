import { JOB_EVENT } from '@repo/constants'
import { createBaseLogger } from '@repo/logger'
import { QUEUE_CLEANUP_STALE_DATA /* , QUEUE_REFRESH_MATERIALIZED_VIEWS */ } from '@repo/queue'
import { createJobDbEntry } from './lib/utils/db'
import { logQueueHealth } from './lib/utils/logger'
import { startPollingServices } from './lib/utils/polling-services'
import { cleanupWorker } from './workers/cleanup/worker'
// import { materializedViewsWorker } from './workers/materialized-views/worker'

const logger = createBaseLogger().child({
  module: 'worker',
})

logger.info({ cwd: process.cwd(), url: import.meta.url })

// Good CRON Time reference: https://crontab.guru/

const workers = [
  // Uncomment when materialized views worker is configured
  // {
  //   worker: materializedViewsWorker,
  //   setup: () => QUEUE_REFRESH_MATERIALIZED_VIEWS,
  // },
  {
    worker: cleanupWorker,
    setup: () => QUEUE_CLEANUP_STALE_DATA,
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
