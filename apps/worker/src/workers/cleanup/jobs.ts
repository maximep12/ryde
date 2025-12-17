import { CRON_PATTERNS } from '@repo/constants'
import { getQueue, QUEUE_CLEANUP_STALE_DATA } from '@repo/queue'
import { connection } from '../../redis'

export const CLEANUP_JOB_NAME = 'Clean Up Stale Data'

export function setupCleanupJobs() {
  const queue = getQueue(QUEUE_CLEANUP_STALE_DATA, connection)

  // Runs every Sunday at 2am to clean up stale data
  queue.add(
    CLEANUP_JOB_NAME,
    {},
    {
      repeat: {
        pattern: CRON_PATTERNS.EVERY_SUNDAY_2AM,
      },
    },
  )

  return queue.name
}
