import { jsonb, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { app } from './app'

// ============================================================================
// BACKGROUND JOB LOGS
// ============================================================================

export const backgroundJobsLogs = app.table('background_jobs_logs', {
  id: serial('id').primaryKey(),
  jobId: text('job_id').notNull(),
  jobName: text('job_name').notNull(),
  event: text('event').notNull(),
  eventData: jsonb('event_data'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})
