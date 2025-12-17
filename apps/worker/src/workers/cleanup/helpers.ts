import { usersSessions } from '@repo/db'
import { lt, sql } from 'drizzle-orm'
import { db } from '../../db'

const TWO_WEEKS_AGO = sql`now() - INTERVAL '2 weeks'`

/**
 * Deletes user sessions where expires_at is older than two weeks
 * @returns Number of sessions deleted
 */
export async function cleanupExpiredUserSessions() {
  const result = await db.delete(usersSessions).where(lt(usersSessions.expiresAt, TWO_WEEKS_AGO))
  return result.rowCount ?? 0
}

/**
 * Runs all cleanup tasks
 * Add additional cleanup functions here as needed
 * @returns Object with cleanup results for each task
 */
export async function runAllCleanupTasks() {
  const [sessionsDeleted] = await Promise.all([
    cleanupExpiredUserSessions(),
    // Add more cleanup tasks here as the app grows, e.g.:
    // cleanupOrphanedRecords(),
    // cleanupOldAuditLogs(),
  ])

  return {
    sessionsDeleted,
  }
}
