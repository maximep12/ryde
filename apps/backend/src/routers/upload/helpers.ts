import { PAGE_SIZE } from '@repo/constants'
import { CSV_UPLOAD_TYPE_S3_PATHS, UploadType } from '@repo/csv'
import { uploadsResults, uploadsToS3, users } from '@repo/db'
import { and, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { ifDefined } from '../../lib/utils/api'
import { ColumnSort } from '../../lib/utils/types'
import { myUploadsQueriesSchema } from './handlers'

export type MyUploadsQueries = z.infer<typeof myUploadsQueriesSchema>

export type AppUploadResult = Pick<uploadsResults, 'uploadId' | 'data' | 'isProcessed' | 'isValid'>

export function generateS3FileName(
  prefix: string,
  uploadType: UploadType,
  extension: string = '.csv',
) {
  const fileName = `${prefix}-${Date.now()}-${uploadType}${extension}`
  return fileName
}

export function logS3Upload({
  userId,
  uploadType,
  fileName,
  fileKey,
  localFileName,
  attributes,
}: {
  userId: string
  uploadType: UploadType
  fileName: string
  fileKey: string
  localFileName: string
  attributes?: Record<string, string>
}) {
  return db.insert(uploadsToS3).values({
    userId,
    type: uploadType,
    fileName,
    fileKey,
    localFileName,
    attributes,
  })
}

export function getS3UploadLog({ uuid, fileName }: { uuid?: string; fileName?: string }) {
  const conditions = [
    ifDefined(uuid, (v) => eq(uploadsToS3.uuid, v)),
    ifDefined(fileName, (v) => eq(uploadsToS3.fileName, v)),
  ]

  const query = db
    .select({
      uploadedBy: uploadsToS3.userId,
      uploadedAt: uploadsToS3.createdAt,
      uuid: uploadsToS3.uuid,
      type: uploadsToS3.type,
      fileName: uploadsToS3.fileName,
      fileKey: uploadsToS3.fileKey,
      localFileName: uploadsToS3.localFileName,
      attributes: uploadsToS3.attributes,
      user: {
        givenName: users.givenName,
        familyName: users.familyName,
      },
      error: uploadsToS3.error,
    })
    .from(uploadsToS3)
    .leftJoin(users, eq(uploadsToS3.userId, users.id))
    .where(or(...conditions))
    .limit(1)

  return query
}

export function getAppUploadResult(uploadId: string) {
  return db
    .select({
      uploadId: uploadsResults.uploadId,
      data: uploadsResults.data,
      validationDetails: uploadsResults.validationDetails,
      isValid: uploadsResults.isValid,
      isProcessed: uploadsResults.isProcessed,
    })
    .from(uploadsResults)
    .where(eq(uploadsResults.uploadId, uploadId))
}

// Lightweight summary for polling - just counts, no row data
export async function getAppUploadResultSummary(uploadId: string) {
  const results = await db
    .select({
      isValid: uploadsResults.isValid,
      isProcessed: uploadsResults.isProcessed,
    })
    .from(uploadsResults)
    .where(eq(uploadsResults.uploadId, uploadId))

  if (results.length === 0) {
    return null
  }

  const total = results.length
  const valid = results.filter((r) => r.isValid).length
  const invalid = total - valid
  const isProcessed = results.every((r) => r.isProcessed)

  return { total, valid, invalid, isProcessed }
}

export function getMyUploadsWhere(queries: MyUploadsQueries) {
  const { type, search } = queries

  const conditions = [
    ifDefined(type, (v) => inArray(uploadsToS3.type, v)),
    ifDefined(search, (v) => {
      const searchPattern = `%${v}%`
      return or(
        ilike(uploadsToS3.localFileName, searchPattern),
        ilike(uploadsToS3.fileName, searchPattern),
        ilike(uploadsToS3.type, searchPattern),
      )
    }),
  ]

  return and(...conditions)
}

export function getMyUploadsOrderBy(sort: ColumnSort) {
  const column =
    {
      createdAt: uploadsToS3.createdAt,
    }[sort.id] ?? null

  return column ? (sort.desc ? desc(column) : column) : null
}

export function getMyUploads(
  userId: string,
  where: ReturnType<typeof getMyUploadsWhere>,
  page: number = 1,
  sort?: ColumnSort,
  pageSize: number = PAGE_SIZE,
  uploadIds?: string[] | null,
) {
  const orderBy = sort ? getMyUploadsOrderBy(sort) : null

  const conditions = [eq(uploadsToS3.userId, userId), where]
  if (uploadIds) {
    conditions.push(inArray(uploadsToS3.uuid, uploadIds))
  }

  const query = db
    .select({
      uuid: uploadsToS3.uuid,
      type: uploadsToS3.type,
      fileName: uploadsToS3.fileName,
      fileKey: uploadsToS3.fileKey,
      localFileName: uploadsToS3.localFileName,
      createdAt: uploadsToS3.createdAt,
      error: uploadsToS3.error,
    })
    .from(uploadsToS3)
    .where(and(...conditions))

  if (orderBy !== null) {
    query.orderBy(orderBy)
  } else {
    query.orderBy(desc(uploadsToS3.createdAt))
  }

  if (page > 0) {
    query.limit(pageSize)
    query.offset((page - 1) * pageSize)
  }

  return query
}

// Get validation summaries for multiple uploads
export async function getUploadsSummaries(uploadIds: string[]) {
  if (uploadIds.length === 0)
    return new Map<
      string,
      { total: number; valid: number; invalid: number; isProcessed: boolean }
    >()

  const results = await db
    .select({
      uploadId: uploadsResults.uploadId,
      isValid: uploadsResults.isValid,
      isProcessed: uploadsResults.isProcessed,
    })
    .from(uploadsResults)
    .where(inArray(uploadsResults.uploadId, uploadIds))

  // Group results by uploadId
  const summaries = new Map<
    string,
    { total: number; valid: number; invalid: number; isProcessed: boolean }
  >()

  for (const result of results) {
    const existing = summaries.get(result.uploadId) ?? {
      total: 0,
      valid: 0,
      invalid: 0,
      isProcessed: true,
    }
    existing.total++
    if (result.isValid) {
      existing.valid++
    } else {
      existing.invalid++
    }
    if (!result.isProcessed) {
      existing.isProcessed = false
    }
    summaries.set(result.uploadId, existing)
  }

  return summaries
}

// Get upload IDs filtered by validation status
// 'valid' = uploads where all processed records are valid (no invalid records)
// 'invalid' = uploads that have at least one invalid record
export async function getUploadIdsByValidationStatus(
  userId: string,
  validationStatus: 'valid' | 'invalid',
) {
  // Get all upload IDs for this user
  const userUploads = await db
    .select({ uuid: uploadsToS3.uuid })
    .from(uploadsToS3)
    .where(eq(uploadsToS3.userId, userId))

  if (userUploads.length === 0) return []

  const uploadIds = userUploads.map((u) => u.uuid)
  const summaries = await getUploadsSummaries(uploadIds)

  // Filter based on validation status
  const filteredIds: string[] = []
  for (const [uploadId, summary] of summaries) {
    if (!summary.isProcessed) continue // Skip unprocessed uploads

    if (validationStatus === 'valid' && summary.invalid === 0 && summary.total > 0) {
      filteredIds.push(uploadId)
    } else if (validationStatus === 'invalid' && summary.invalid > 0) {
      filteredIds.push(uploadId)
    }
  }

  return filteredIds
}

export function getMyUploadsRowCount(
  userId: string,
  where: ReturnType<typeof getMyUploadsWhere>,
  uploadIds?: string[] | null,
) {
  const conditions = [eq(uploadsToS3.userId, userId), where]
  if (uploadIds) {
    conditions.push(inArray(uploadsToS3.uuid, uploadIds))
  }

  return db
    .select({ count: count() })
    .from(uploadsToS3)
    .where(and(...conditions))
}

export function getUploadPath(uploadType: UploadType) {
  return CSV_UPLOAD_TYPE_S3_PATHS[uploadType]
}

// Get upload details by UUID with paginated results
export function getUploadDetails(uploadId: string) {
  return db
    .select({
      uuid: uploadsToS3.uuid,
      type: uploadsToS3.type,
      fileName: uploadsToS3.fileName,
      fileKey: uploadsToS3.fileKey,
      localFileName: uploadsToS3.localFileName,
      attributes: uploadsToS3.attributes,
      error: uploadsToS3.error,
      createdAt: uploadsToS3.createdAt,
      uploadedBy: uploadsToS3.userId,
      user: {
        givenName: users.givenName,
        familyName: users.familyName,
      },
    })
    .from(uploadsToS3)
    .leftJoin(users, eq(uploadsToS3.userId, users.id))
    .where(eq(uploadsToS3.uuid, uploadId))
    .limit(1)
}

// Get paginated upload results
export function getUploadResultsPaginated(
  uploadId: string,
  page: number = 1,
  pageSize: number = PAGE_SIZE,
  filter?: 'all' | 'valid' | 'invalid',
) {
  const conditions = [eq(uploadsResults.uploadId, uploadId)]

  if (filter === 'valid') {
    conditions.push(eq(uploadsResults.isValid, true))
  } else if (filter === 'invalid') {
    conditions.push(eq(uploadsResults.isValid, false))
  }

  return db
    .select({
      id: uploadsResults.id,
      rowIndex: uploadsResults.rowIndex,
      data: uploadsResults.data,
      validationDetails: uploadsResults.validationDetails,
      isValid: uploadsResults.isValid,
      isProcessed: uploadsResults.isProcessed,
    })
    .from(uploadsResults)
    .where(and(...conditions))
    .orderBy(uploadsResults.rowIndex)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
}

// Get upload results count
export async function getUploadResultsCount(
  uploadId: string,
  filter?: 'all' | 'valid' | 'invalid',
) {
  const conditions = [eq(uploadsResults.uploadId, uploadId)]

  if (filter === 'valid') {
    conditions.push(eq(uploadsResults.isValid, true))
  } else if (filter === 'invalid') {
    conditions.push(eq(uploadsResults.isValid, false))
  }

  return db
    .select({ count: count() })
    .from(uploadsResults)
    .where(and(...conditions))
}

// Get all invalid upload results (for CSV export)
export function getInvalidUploadResults(uploadId: string) {
  return db
    .select({
      rowIndex: uploadsResults.rowIndex,
      data: uploadsResults.data,
      validationDetails: uploadsResults.validationDetails,
    })
    .from(uploadsResults)
    .where(and(eq(uploadsResults.uploadId, uploadId), eq(uploadsResults.isValid, false)))
    .orderBy(uploadsResults.rowIndex)
}
