import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PAGE_SIZE } from '@repo/constants'
import { CSV_HEADERS, UPLOAD_REPORT_STATUS, UPLOAD_TYPES } from '@repo/csv'
import { stringifiedArray } from '@repo/zod-schemas'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { datatableSearchSchema } from '../../lib/utils/datatableSearchSchema'
import { env } from '../../lib/utils/env'
import {
  generateS3FileName,
  getAppUploadResult,
  getAppUploadResultSummary,
  getInvalidUploadResults,
  getMyUploads,
  getMyUploadsRowCount,
  getMyUploadsWhere,
  getS3UploadLog,
  getUploadDetails,
  getUploadIdsByValidationStatus,
  getUploadPath,
  getUploadResultsCount,
  getUploadResultsPaginated,
  getUploadsSummaries,
  logS3Upload,
} from './helpers'

const uploadData = new Hono<{ Variables: ContextVariables }>()

function getS3Client() {
  if (
    !env.AWS_FILE_UPLOAD_S3_BUCKET_REGION ||
    !env.AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID ||
    !env.AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID
  ) {
    throw new HTTPException(503, { message: 'S3 upload is not configured' })
  }

  return new S3Client({
    region: env.AWS_FILE_UPLOAD_S3_BUCKET_REGION,
    credentials: {
      accessKeyId: env.AWS_FILE_UPLOAD_IAM_USER_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_FILE_UPLOAD_IAM_USER_SECRET_ACCESS_KEY_ID,
    },
  })
}

export const myUploadsQueriesSchema = z.object({
  ...datatableSearchSchema.shape,
  type: stringifiedArray.optional(),
  validationStatus: z.enum(['valid', 'invalid']).optional(),
  search: z.string().optional(),
})

export const uploadDataDefinition = uploadData
  .post(
    '/signed-url/download',
    zValidatorThrow(
      'json',
      z.object({
        fileName: z.string(),
        uploadType: z.enum(UPLOAD_TYPES),
      }),
    ),
    async (c) => {
      const { fileName, uploadType } = c.req.valid('json')

      const uploadPath = getUploadPath(uploadType)
      const fileKey = `${uploadPath}/${fileName}`

      const command = new GetObjectCommand({
        Bucket: env.AWS_FILE_UPLOAD_S3_BUCKET_NAME,
        Key: fileKey,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
      })

      const s3 = getS3Client()
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 90 })

      return c.json({ url: signedUrl })
    },
  )

  .post(
    '/signed-url/upload',
    zValidatorThrow(
      'json',
      z.object({
        uploadType: z.enum(UPLOAD_TYPES),
        localFileName: z.string(),
        attributes: z.record(z.string(), z.string()).optional(),
      }),
    ),
    async (c) => {
      const { uploadType, localFileName, attributes } = c.req.valid('json')

      const uploadPath = getUploadPath(uploadType)

      const userId = c.get('user').id
      const fileName = generateS3FileName(userId, uploadType)
      const fileKey = `${uploadPath}/${fileName}`

      const params = {
        Bucket: env.AWS_FILE_UPLOAD_S3_BUCKET_NAME,
        Key: fileKey,
        ContentType: 'text/csv',
        Metadata: {
          ...attributes,
        },
      }

      const s3 = getS3Client()
      const command = new PutObjectCommand(params)
      const signedUrl = await getSignedUrl(s3, command, { expiresIn: 180 })

      const uploadLog = await logS3Upload({
        userId,
        uploadType,
        fileName,
        fileKey,
        localFileName,
        attributes,
      })

      if (!uploadLog) {
        throw new HTTPException(500, {
          message: 'Failed to insert S3 upload log',
        })
      }

      return c.json({ url: signedUrl, fileKey, fileName })
    },
  )

  .get(
    '/status',
    zValidatorThrow('query', z.object({ fileName: z.string().optional() })),
    async (c) => {
      const { fileName } = c.req.valid('query')

      const [metadata] = await getS3UploadLog({ fileName })
      if (!metadata) {
        throw new HTTPException(404, {
          message: 'Upload Log not found',
        })
      }

      const uploadResults = await getAppUploadResult(metadata.uuid)

      const hasBeenFound = uploadResults && uploadResults.length > 0
      if (!hasBeenFound) {
        return c.json({
          metadata,
          status: UPLOAD_REPORT_STATUS.NOT_STARTED,
          uploadResults,
        })
      }

      const isProcessing = !uploadResults[0]?.isProcessed
      if (isProcessing)
        return c.json({ metadata, status: UPLOAD_REPORT_STATUS.PROCESSING, uploadResults })

      return c.json({ metadata, status: UPLOAD_REPORT_STATUS.COMPLETED, uploadResults })
    },
  )

  // Lightweight endpoint for polling - returns only metadata + summary counts
  .get(
    '/status/summary',
    zValidatorThrow('query', z.object({ fileName: z.string().optional() })),
    async (c) => {
      const { fileName } = c.req.valid('query')

      const [metadata] = await getS3UploadLog({ fileName })
      if (!metadata) {
        throw new HTTPException(404, {
          message: 'Upload Log not found',
        })
      }

      const summary = await getAppUploadResultSummary(metadata.uuid)

      if (!summary) {
        return c.json({
          metadata,
          status: UPLOAD_REPORT_STATUS.NOT_STARTED,
          summary: null,
        })
      }

      if (!summary.isProcessed) {
        return c.json({
          metadata,
          status: UPLOAD_REPORT_STATUS.PROCESSING,
          summary: { total: summary.total, valid: summary.valid, invalid: summary.invalid },
        })
      }

      return c.json({
        metadata,
        status: UPLOAD_REPORT_STATUS.COMPLETED,
        summary: { total: summary.total, valid: summary.valid, invalid: summary.invalid },
      })
    },
  )

  // Upload details endpoint with paginated results
  .get(
    '/details/:uploadId',
    zValidatorThrow(
      'param',
      z.object({
        uploadId: z.string().uuid(),
      }),
    ),
    zValidatorThrow(
      'query',
      z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
        filter: z.enum(['all', 'valid', 'invalid']).optional(),
      }),
    ),
    async (c) => {
      const { uploadId } = c.req.valid('param')
      const { page, pageSize, filter } = c.req.valid('query')

      // Get upload metadata
      const [upload] = await getUploadDetails(uploadId)
      if (!upload) {
        throw new HTTPException(404, {
          message: 'Upload not found',
        })
      }

      // Get summary counts
      const summary = await getAppUploadResultSummary(uploadId)

      // Get paginated results
      const [results, [countResult]] = await Promise.all([
        getUploadResultsPaginated(uploadId, page, pageSize, filter),
        getUploadResultsCount(uploadId, filter),
      ])

      const count = countResult?.count ?? 0

      return c.json({
        upload,
        summary,
        results,
        pagination: {
          page,
          pageSize,
          total: count,
          totalPages: Math.ceil(count / pageSize),
        },
      })
    },
  )

  // Download invalid results as CSV
  .get(
    '/details/:uploadId/invalid-csv',
    zValidatorThrow(
      'param',
      z.object({
        uploadId: z.string().uuid(),
      }),
    ),
    async (c) => {
      const { uploadId } = c.req.valid('param')

      // Get upload metadata to determine the type and get headers
      const [upload] = await getUploadDetails(uploadId)
      if (!upload) {
        throw new HTTPException(404, {
          message: 'Upload not found',
        })
      }

      // Get all invalid results
      const invalidResults = await getInvalidUploadResults(uploadId)

      if (invalidResults.length === 0) {
        throw new HTTPException(404, {
          message: 'No invalid results found',
        })
      }

      // Get headers for this upload type
      const headers = CSV_HEADERS[upload.type as keyof typeof CSV_HEADERS]
      if (!headers) {
        throw new HTTPException(400, {
          message: 'Unknown upload type',
        })
      }

      // Build CSV content
      const csvLines: string[] = []

      // Add header row
      csvLines.push(headers.join(','))

      // Add data rows
      for (const result of invalidResults) {
        const data = result.data as Record<string, unknown>
        const row = headers.map((header) => {
          const value = data[header]
          if (value === null || value === undefined) return ''
          const strValue = String(value)
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`
          }
          return strValue
        })
        csvLines.push(row.join(','))
      }

      const csvContent = csvLines.join('\n')
      const fileName = `invalid-results-${upload.localFileName || upload.fileName}`

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      })
    },
  )

  .get('/my-uploads', zValidatorThrow('query', myUploadsQueriesSchema), async (c) => {
    const queries = c.req.valid('query')
    const userId = c.get('user').id

    const where = getMyUploadsWhere(queries)

    // If filtering by validation status, get the matching upload IDs first
    let validationFilterIds: string[] | null = null
    if (queries.validationStatus) {
      validationFilterIds = await getUploadIdsByValidationStatus(userId, queries.validationStatus)
      // If no uploads match the filter, return empty result
      if (validationFilterIds.length === 0) {
        return c.json({ myUploads: [], count: 0 })
      }
    }

    const [uploads, [rowCount]] = await Promise.all([
      getMyUploads(
        userId,
        where,
        queries.page,
        queries.sort,
        queries.pageSize ?? PAGE_SIZE,
        validationFilterIds,
      ),
      getMyUploadsRowCount(userId, where, validationFilterIds),
    ])

    // Get validation summaries for all uploads
    const uploadIds = uploads.map((u) => u.uuid)
    const summaries = await getUploadsSummaries(uploadIds)

    // Merge summaries into uploads
    const myUploads = uploads.map((upload) => ({
      ...upload,
      summary: summaries.get(upload.uuid) ?? null,
    }))

    return c.json({ myUploads, ...rowCount })
  })
