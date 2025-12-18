import { createBaseLogger } from '@repo/logger'
import { QUEUE_PLACEHOLDER } from '@repo/queue'
import { Worker } from 'bullmq'
import { WORKER_DEFAULT_OPTIONS } from '../../lib/utils/options'

export const placeholderWorker = new Worker(
  QUEUE_PLACEHOLDER,
  async (job) => {
    const logger = createBaseLogger().child({
      module: 'placeholder-worker',
      queue: QUEUE_PLACEHOLDER,
    })

    logger.info(
      { job_id: job.id, job_name: job.name },
      'Placeholder background job has been run successfully.',
    )

    return { success: true }
  },
  WORKER_DEFAULT_OPTIONS,
)
