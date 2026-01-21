import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PAGE_SIZE } from '@repo/constants'
import { CSV_UPLOAD_TYPES, UPLOAD_REPORT_STATUS } from '@repo/csv'
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
  getMyUploads,
  getMyUploadsRowCount,
  getMyUploadsWhere,
  getS3UploadLog,
  getUploadPath,
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
})

export const uploadDataDefinition = uploadData
  .post(
    '/signed-url/download',
    zValidatorThrow(
      'json',
      z.object({
        fileName: z.string(),
        uploadType: z.enum(CSV_UPLOAD_TYPES),
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
        uploadType: z.enum(CSV_UPLOAD_TYPES),
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

  .get('/my-uploads', zValidatorThrow('query', myUploadsQueriesSchema), async (c) => {
    const queries = c.req.valid('query')
    const userId = c.get('user').id

    const where = getMyUploadsWhere(queries)

    const [myUploads, [rowCount]] = await Promise.all([
      getMyUploads(userId, where, queries.page, queries.sort, queries.pageSize ?? PAGE_SIZE),
      getMyUploadsRowCount(userId, where),
    ])

    return c.json({ myUploads, ...rowCount })
  })
