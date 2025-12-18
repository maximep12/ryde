import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const getQueue = (queue: string, connection: IORedis) => new Queue(queue, { connection })

// Materialized views queue
export const QUEUE_REFRESH_MATERIALIZED_VIEWS = 'queue_refresh_materialized_views'

// Cleanup queue
export const QUEUE_CLEANUP_STALE_DATA = 'queue_cleanup_stale_data'

// Placeholder queue
export const QUEUE_PLACEHOLDER = 'queue_placeholder'
