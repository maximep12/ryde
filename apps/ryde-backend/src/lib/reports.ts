import { reports, uploadedFiles, users } from '@repo/db'
import { and, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
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
    .set({
      reportEnd: new Date().toISOString(),
      ...rest,
      notifSent: true,
      warnings: { rejected },
      extra: { identical },
    })
    .where(eq(reports.id, id))
}

export async function linkReportToUploadedFile(id: number, uploadedFileId: string) {
  await db.update(reports).set({ uploadedFileId }).where(eq(reports.id, id))
}

export async function updateReportFailure(id: number, failure: string) {
  await db
    .update(reports)
    .set({ failure, reportEnd: new Date().toISOString(), notifSent: true })
    .where(eq(reports.id, id))
}

const reportColumns = {
  id: reports.id,
  type: reports.type,
  failure: reports.failure,
  warnings: reports.warnings,
  reportStart: reports.reportStart,
  reportEnd: reports.reportEnd,
  created: reports.created,
  updated: reports.updated,
  deleted: reports.deleted,
  extra: reports.extra,
  fileName: reports.fileName,
  createdAt: reports.createdAt,
  downloadPath: uploadedFiles.downloadPath,
  uploadedBy: uploadedFiles.by,
  uploaderGivenName: users.givenName,
  uploaderFamilyName: users.familyName,
}

export async function getReportsByType(type: string, page: number, pageSize: number) {
  const [rows, [countRow]] = await Promise.all([
    db
      .select(reportColumns)
      .from(reports)
      .leftJoin(uploadedFiles, eq(reports.uploadedFileId, uploadedFiles.id))
      .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id))
      .where(eq(reports.type, type))
      .orderBy(desc(reports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(reports).where(eq(reports.type, type)),
  ])
  return { rows, total: Number(countRow?.total ?? 0) }
}

export type ReportFilters = {
  types?: string[]
  dateFrom?: string
  dateTo?: string
  status?: 'success' | 'failed'
  uploadedBy?: string
}

export async function getAllReports(page: number, pageSize: number, filters?: ReportFilters) {
  const conditions = []
  if (filters?.types?.length) {
    conditions.push(inArray(reports.type, filters.types))
  }
  if (filters?.dateFrom) {
    conditions.push(gte(reports.createdAt, filters.dateFrom))
  }
  if (filters?.dateTo) {
    conditions.push(lte(reports.createdAt, filters.dateTo + 'T23:59:59.999Z'))
  }
  if (filters?.status === 'success') {
    conditions.push(isNull(reports.failure))
  } else if (filters?.status === 'failed') {
    conditions.push(isNotNull(reports.failure))
  }
  if (filters?.uploadedBy) {
    const term = `%${filters.uploadedBy}%`
    conditions.push(or(ilike(users.givenName, term), ilike(users.familyName, term), ilike(uploadedFiles.by, term)))
  }

  const whereClause = conditions.length ? and(...conditions) : undefined

  const baseQuery = db
    .select(reportColumns)
    .from(reports)
    .leftJoin(uploadedFiles, eq(reports.uploadedFileId, uploadedFiles.id))
    .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id))

  const countQuery = db
    .select({ total: count() })
    .from(reports)
    .leftJoin(uploadedFiles, eq(reports.uploadedFileId, uploadedFiles.id))
    .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id))

  const [rows, [countRow]] = await Promise.all([
    baseQuery
      .where(whereClause)
      .orderBy(desc(reports.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    countQuery.where(whereClause),
  ])
  return { rows, total: Number(countRow?.total ?? 0) }
}

export async function getDistinctReportTypes() {
  const rows = await db.selectDistinct({ type: reports.type }).from(reports).orderBy(reports.type)
  return rows.map((r) => r.type)
}

export async function getReportById(id: number) {
  const [row] = await db
    .select(reportColumns)
    .from(reports)
    .leftJoin(uploadedFiles, eq(reports.uploadedFileId, uploadedFiles.id))
    .leftJoin(users, eq(uploadedFiles.uploadedBy, users.id))
    .where(eq(reports.id, id))
    .limit(1)
  return row ?? null
}
