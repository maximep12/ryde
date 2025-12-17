import { booksStatsMview } from '@repo/db'
import { QUEUE_REFRESH_MATERIALIZED_VIEWS } from '@repo/queue'
import { Worker } from 'bullmq'
import { z } from 'zod'
import { db } from '../../db'
import { WORKER_DEFAULT_OPTIONS } from '../../lib/utils/options'

export const MATERIALIZED_VIEWS = {
  BOOKS_STATS: booksStatsMview,
} as const

export type MaterializedView = keyof typeof MATERIALIZED_VIEWS

export const MVIEWS = Object.freeze(
  Object.fromEntries(Object.keys(MATERIALIZED_VIEWS).map((key) => [key, key])) as Record<
    MaterializedView,
    MaterializedView
  >,
)

const mviewJobDataSchema = z.object({
  mview: z.enum(Object.keys(MATERIALIZED_VIEWS) as [MaterializedView, ...MaterializedView[]]),
})

export const materializedViewsWorker = new Worker(
  QUEUE_REFRESH_MATERIALIZED_VIEWS,
  async (job) => {
    const { mview } = mviewJobDataSchema.parse(job.data)
    await db.refreshMaterializedView(MATERIALIZED_VIEWS[mview]).concurrently()
  },
  WORKER_DEFAULT_OPTIONS,
)
