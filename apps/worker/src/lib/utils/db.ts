import { jobsLogs } from '@repo/db'
import { db } from '../../db'

type JobData = {
  jobId: string
  jobName: string
  event: string
  eventData: string
}

export function createJobDbEntry(job: JobData) {
  return db.insert(jobsLogs).values({ ...job, timestamp: new Date() })
}
