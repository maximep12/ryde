import { createBaseLogger } from '@repo/logger'
import { getQueue } from '@repo/queue'
import { connection } from '../../redis'

export const logQueueHealth = async (queueId: string) => {
  const queue = getQueue(queueId, connection)

  const [active, waiting, delayed] = await Promise.all([
    queue.getActiveCount(),
    queue.getWaitingCount(),
    queue.getDelayedCount(),
  ])

  const logger = createBaseLogger().child({
    module: 'worker',
    queue: queueId,
  })

  logger.info({ active, waiting, delayed }, 'queue health status')
}
