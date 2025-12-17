import { createBaseLogger } from '@repo/logger'
import { QUEUE_CLEANUP_STALE_DATA } from '@repo/queue'
import { Worker } from 'bullmq'
import { WORKER_DEFAULT_OPTIONS } from '../../lib/utils/options'
import { runAllCleanupTasks } from './helpers'

export const cleanupWorker = new Worker(
  QUEUE_CLEANUP_STALE_DATA,
  async (job) => {
    const logger = createBaseLogger().child({
      module: 'cleanup-worker',
      queue: QUEUE_CLEANUP_STALE_DATA,
    })

    const results = await runAllCleanupTasks()

    logger.info(
      { job_id: job.id, job_name: job.name, results },
      `Cleanup completed - Expired sessions deleted: ${results.sessionsDeleted}`,
    )

    return results
  },
  WORKER_DEFAULT_OPTIONS,
)
