import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { UPLOADS_ERROR_CODES } from '@repo/constants'
import { CSV_HEADERS, UploadType } from '@repo/csv'
import { UploadsToS3 } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { ProcessingQueue } from '@repo/queue'
import { Worker } from 'bullmq'
import { parse } from 'csv-parse'
import { env } from 'process'
import { Readable } from 'stream'
import { z } from 'zod'
import { WORKER_DEFAULT_OPTIONS } from '../../../lib/utils/options'
import { ProcessingJob } from '../types'
import {
  insertUploadResultRecord,
  markAppUploadResultAsProcessed,
  setS3UploadError,
} from './uploads'

function isHeaderRow(record: Record<string, unknown>, columns: readonly string[]): boolean {
  const values = columns.map((col) => String(record[col]).trim())
  return values.every((value, idx) => value === columns[idx])
}

const getProcessRecordFn = <S extends z.ZodSchema, R>(
  upload: UploadsToS3,
  schema: S,
  validate: (
    record: z.infer<S>,
    metadata: Record<string, string> | undefined,
  ) => Promise<{ isValid: boolean; details?: unknown }>,
  process: (record: z.infer<S>, metadata: Record<string, string> | undefined) => Promise<R>,
  metadata?: Record<string, string>,
) => {
  return async (record: z.infer<S>, rowIndex: number): Promise<boolean> => {
    const parsedRecord = schema.safeParse(record)
    if (!parsedRecord.success) {
      throw new Error(UPLOADS_ERROR_CODES.ZOD_SCHEMA_ERROR)
    }

    const validation = await validate(parsedRecord.data, metadata)
    if (!validation.isValid) {
      await insertUploadResultRecord(upload.uuid, record as Record<string, unknown>, rowIndex, false, validation.details)
      return false
    }

    const processedRecord = await process(parsedRecord.data, metadata)
    await insertUploadResultRecord(
      upload.uuid,
      processedRecord as Record<string, unknown>,
      rowIndex,
      true,
      validation.details,
    )

    return true
  }
}

export function getProcessingWorker<S extends z.ZodSchema, R>(
  s3: S3Client,
  queue: ProcessingQueue,
  schema: S,
  validate: (
    record: z.infer<S>,
    metadata: Record<string, string> | undefined,
  ) => Promise<{ isValid: boolean; details?: unknown }>,
  process: (record: z.infer<S>, metadata: Record<string, string> | undefined) => Promise<R>,
) {
  return new Worker(
    queue,
    async (job: ProcessingJob) => {
      const logger = createBaseLogger().child({
        module: 'worker',
        queue,
      })

      const { upload } = job.data
      logger.info('Processing file')

      const bucketName = env.AWS_FILE_UPLOAD_S3_BUCKET_NAME

      const columns = CSV_HEADERS[upload.type as UploadType]
      let rowIndex = 0
      let headerChecked = false

      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: upload.fileKey,
        })

        const { Body, Metadata } = await s3.send(command)

        if (!Body || !(Body instanceof Readable)) {
          logger.error({ key: upload.fileKey }, 'File stream not available')
          throw new Error('File stream not available')
        }

        logger.info('Processing...')
        const fileStream = Body as Readable

        // Initialize the parser
        const parser = parse({
          delimiter: ',',
          columns: [...columns],
          trim: true,
          skip_empty_lines: true,
        })

        // Catch any error
        parser.on('error', async function (err) {
          logger.error(err.message)
          await setS3UploadError(upload.uuid, err)
          return
        })

        fileStream.pipe(parser)

        const processRecord = getProcessRecordFn(
          upload,
          schema,
          validate,
          process,
          Metadata,
        )

        // Use the readable stream api to consume records
        for await (const record of parser) {
          if (!headerChecked) {
            if (isHeaderRow(record, columns)) {
              headerChecked = true
              continue
            }

            headerChecked = true
          }

          await processRecord(record, rowIndex)
          rowIndex++
        }

        await markAppUploadResultAsProcessed(upload.uuid)
      } catch (err: unknown) {
        logger.error(err, 'Download error')

        await setS3UploadError(upload.uuid, err)
        return
      }
    },
    WORKER_DEFAULT_OPTIONS,
  )
}
