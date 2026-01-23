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
import { db } from '../../../db'
import { WORKER_DEFAULT_OPTIONS } from '../../../lib/utils/options'
import { BatchProcessFn, BatchValidateFn, ProcessingJob } from '../types'
import {
  batchInsertUploadResults,
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
      // Format Zod errors into a readable object
      const errorDetails: Record<string, string> = {}
      for (const issue of parsedRecord.error.issues) {
        const field = issue.path.join('.')
        errorDetails[field] = issue.message
      }
      await insertUploadResultRecord(
        upload.uuid,
        record as Record<string, unknown>,
        rowIndex,
        false,
        errorDetails,
      )
      return false
    }

    const validation = await validate(parsedRecord.data, metadata)
    if (!validation.isValid) {
      await insertUploadResultRecord(
        upload.uuid,
        record as Record<string, unknown>,
        rowIndex,
        false,
        validation.details,
      )
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

        const processRecord = getProcessRecordFn(upload, schema, validate, process, Metadata)

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

export function getBatchProcessingWorker<S extends z.ZodSchema, D>(
  s3: S3Client,
  queue: ProcessingQueue,
  schema: S,
  batchValidate: BatchValidateFn<S, D>,
  batchProcess: BatchProcessFn<S>,
  batchSize = 500,
) {
  return new Worker(
    queue,
    async (job: ProcessingJob) => {
      const logger = createBaseLogger().child({
        module: 'worker',
        queue,
      })

      const { upload } = job.data
      logger.info('Processing file with batch processing')

      const bucketName = env.AWS_FILE_UPLOAD_S3_BUCKET_NAME

      const columns = CSV_HEADERS[upload.type as UploadType]
      let rowIndex = 0
      let headerChecked = false

      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: upload.fileKey,
        })

        const { Body } = await s3.send(command)

        if (!Body || !(Body instanceof Readable)) {
          logger.error({ key: upload.fileKey }, 'File stream not available')
          throw new Error('File stream not available')
        }

        logger.info('Processing with batches...')
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

        // Batch processing
        let batch: Array<{ record: z.infer<S>; rowIndex: number }> = []

        const processBatch = async (currentBatch: typeof batch) => {
          if (currentBatch.length === 0) return

          // Parse and validate all records in the batch
          const parsedBatch: Array<{ record: z.infer<S>; rowIndex: number }> = []
          const zodErrors: Array<{
            rowIndex: number
            record: unknown
            errors: z.ZodIssue[]
          }> = []

          for (const item of currentBatch) {
            const parsedRecord = schema.safeParse(item.record)
            if (!parsedRecord.success) {
              zodErrors.push({
                rowIndex: item.rowIndex,
                record: item.record,
                errors: parsedRecord.error.issues,
              })
            } else {
              parsedBatch.push({ record: parsedRecord.data, rowIndex: item.rowIndex })
            }
          }

          // If any zod errors, insert them as invalid results with detailed error messages
          if (zodErrors.length > 0) {
            const zodErrorResults = zodErrors.map((e) => {
              // Format Zod errors into a readable object
              const errorDetails: Record<string, string> = {}
              for (const issue of e.errors) {
                const field = issue.path.join('.')
                errorDetails[field] = issue.message
              }
              return {
                data: e.record as Record<string, unknown>,
                rowIndex: e.rowIndex,
                isValid: false,
                validationDetails: errorDetails,
              }
            })
            await batchInsertUploadResults(upload.uuid, zodErrorResults)
          }

          if (parsedBatch.length === 0) return

          // Batch validate
          const validated = await batchValidate(parsedBatch)
          const valid = validated.filter((r) => r.isValid)
          const invalid = validated.filter((r) => !r.isValid)

          // Transaction for valid records: insert entities and results together
          if (valid.length > 0) {
            await db.transaction(async (tx) => {
              // Insert valid entities
              await batchProcess(
                tx,
                valid.map((r) => r.record as z.infer<S>),
              )

              // Insert valid results in the same transaction
              const validResults = valid.map((r) => ({
                data: r.record as Record<string, unknown>,
                rowIndex: r.rowIndex,
                isValid: true,
                validationDetails: r.details,
              }))
              await batchInsertUploadResults(upload.uuid, validResults, tx)
            })
          }

          // Insert invalid results outside transaction
          if (invalid.length > 0) {
            const invalidResults = invalid.map((r) => ({
              data: r.record as Record<string, unknown>,
              rowIndex: r.rowIndex,
              isValid: false,
              validationDetails: r.details,
            }))
            await batchInsertUploadResults(upload.uuid, invalidResults)
          }

          logger.info(
            { batchSize: currentBatch.length, valid: valid.length, invalid: invalid.length },
            'Processed batch',
          )
        }

        // Use the readable stream api to consume records
        for await (const record of parser) {
          if (!headerChecked) {
            if (isHeaderRow(record, columns)) {
              headerChecked = true
              continue
            }

            headerChecked = true
          }

          batch.push({ record, rowIndex })
          rowIndex++

          if (batch.length >= batchSize) {
            await processBatch(batch)
            batch = []
          }
        }

        // Process remaining records
        await processBatch(batch)

        await markAppUploadResultAsProcessed(upload.uuid)
        logger.info({ totalRows: rowIndex }, 'Batch processing complete')
      } catch (err: unknown) {
        logger.error(err, 'Download error')

        await setS3UploadError(upload.uuid, err)
        return
      }
    },
    WORKER_DEFAULT_OPTIONS,
  )
}
