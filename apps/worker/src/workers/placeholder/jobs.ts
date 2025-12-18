import { CRON_PATTERNS } from '@repo/constants'
import { getQueue, QUEUE_PLACEHOLDER } from '@repo/queue'
import { connection } from '../../redis'

export const PLACEHOLDER_JOB_NAME = 'Placeholder Job'

export function setupPlaceholderJobs() {
  const queue = getQueue(QUEUE_PLACEHOLDER, connection)

  // Runs every 15 minutes
  queue.add(
    PLACEHOLDER_JOB_NAME,
    {},
    {
      repeat: {
        pattern: CRON_PATTERNS.EVERY_15_MINUTES,
      },
    },
  )

  return queue.name
}
