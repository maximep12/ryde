import { reports } from '@repo/db'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '../db'

export async function createReport(type: string, fileName: string) {
  const [report] = await db
    .insert(reports)
    .values({ type, reportStart: new Date().toISOString(), fileName, notifSent: false })
    .returning()
  if (!report) throw new Error('Failed to create report')
  return report
}

export async function updateReportSuccess(
  id: number,
  data: { created: number; updated: number; deleted?: number; rejected: string[]; identical: number },
) {
  const { rejected, identical, ...rest } = data
  await db
    .update(reports)
    .set({ reportEnd: new Date().toISOString(), ...rest, notifSent: true, warnings: { rejected }, extra: { identical } })
    .where(eq(reports.id, id))
}

export async function updateReportFailure(id: number, failure: string) {
  await db
    .update(reports)
    .set({ failure, reportEnd: new Date().toISOString(), notifSent: true })
    .where(eq(reports.id, id))
}

export async function getReportsByType(type: string, page: number, pageSize: number) {
  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(reports)
      .where(eq(reports.type, type))
      .orderBy(desc(reports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(reports).where(eq(reports.type, type)),
  ])
  return { rows, total: Number(countRow?.total ?? 0) }
}
