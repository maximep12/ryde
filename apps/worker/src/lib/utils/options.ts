import { WorkerOptions } from 'bullmq'
import { connection } from '../../redis'

const TWO_WEEKS_IN_SECONDS = 14 * 24 * 3600

export const WORKER_DEFAULT_OPTIONS: WorkerOptions = {
  connection,
  autorun: false,
  concurrency: 5,
  removeOnComplete: {
    age: TWO_WEEKS_IN_SECONDS,
    count: 1000,
  },
  removeOnFail: {
    age: TWO_WEEKS_IN_SECONDS,
    count: 1000,
  },
}
