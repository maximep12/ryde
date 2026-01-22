import { PAGE_SIZE } from '@repo/constants'
import { CSV_UPLOAD_TYPE_S3_PATHS, UploadType } from '@repo/csv'
import { uploadsResults, uploadsToS3, users } from '@repo/db'
import { and, count, desc, eq, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { ifDefined } from '../../lib/utils/api'
import { ColumnSort } from '../../lib/utils/types'
import { myUploadsQueriesSchema } from './handlers'

export type MyUploadsQueries = z.infer<typeof myUploadsQueriesSchema>

export type AppUploadResult = Pick<
  uploadsResults,
  'uploadId' | 'data' | 'isProcessed' | 'isValid'
>

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

export function getMyUploadsWhere(queries: MyUploadsQueries) {
  const { type } = queries

  const conditions = [ifDefined(type, (v) => inArray(uploadsToS3.type, v))]

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
) {
  const orderBy = sort ? getMyUploadsOrderBy(sort) : null

  const query = db
    .select()
    .from(uploadsToS3)
    .where(and(eq(uploadsToS3.userId, userId), where))

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

export function getMyUploadsRowCount(userId: string, where: ReturnType<typeof getMyUploadsWhere>) {
  return db
    .select({ count: count() })
    .from(uploadsToS3)
    .where(and(eq(uploadsToS3.userId, userId), where))
}

export function getUploadPath(uploadType: UploadType) {
  return CSV_UPLOAD_TYPE_S3_PATHS[uploadType]
}
