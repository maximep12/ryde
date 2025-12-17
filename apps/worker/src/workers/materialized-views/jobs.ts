import { CRON_PATTERNS } from '@repo/constants'
import { getQueue, QUEUE_REFRESH_MATERIALIZED_VIEWS } from '@repo/queue'
import { connection } from '../../redis'
import { MaterializedView } from './worker'

export const REFRESH_MVIEWS_DEFAULT_REPEAT = CRON_PATTERNS.EVERY_25_MINUTES

const jobsConfig = {
  BOOKS_STATS: {
    jobName: 'Refresh Books Stats MView',
    cronPattern: CRON_PATTERNS.EVERY_HOUR,
  },
} satisfies Record<MaterializedView, { jobName: string; cronPattern: string }>

export function setupMaterializedViewsJobs() {
  const queue = getQueue(QUEUE_REFRESH_MATERIALIZED_VIEWS, connection)

  Object.entries(jobsConfig).forEach(([mview, { jobName, cronPattern }]) => {
    queue.add(jobName, { mview }, { repeat: { pattern: cronPattern } })
  })

  // Example of adding a job manually
  // queue.add(
  //   'Refresh Books Stats MView',
  //   { mview: MVIEWS.BOOKS_STATS },
  //   {
  //     repeat: {
  //       pattern: REFRESH_MVIEWS_DEFAULT_REPEAT,
  //     },
  //   },
  // )

  return queue.name
}
