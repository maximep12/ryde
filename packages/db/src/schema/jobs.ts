import { serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { app } from './app'

export const jobsLogs = app.table('jobs_logs', {
  id: serial('id').primaryKey(),
  jobId: text('job_id').notNull(),
  jobName: text('job_name').notNull(),
  event: text('event').notNull(),
  eventData: jsonb('event_data'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})
