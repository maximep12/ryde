import * as schema from '@repo/db'
import { UploadsToS3 } from '@repo/db'
import { Job } from 'bullmq'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'

export type ProcessingJobData = { upload: UploadsToS3 }
export type ProcessingJob = Job<ProcessingJobData>

// Transaction type for Drizzle node-postgres
export type NodePgTransaction = Parameters<
  Parameters<NodePgDatabase<typeof schema>['transaction']>[0]
>[0]

// Batch validation result with details
export type BatchValidationResult<D> = {
  rowIndex: number
  record: unknown
  isValid: boolean
  details: D
}

// Batch validation function signature
export type BatchValidateFn<S extends z.ZodSchema, D> = (
  records: Array<{ record: z.infer<S>; rowIndex: number }>,
) => Promise<Array<BatchValidationResult<D>>>

// Batch processing function signature (insert records in transaction)
export type BatchProcessFn<S extends z.ZodSchema> = (
  tx: NodePgTransaction,
  records: z.infer<S>[],
) => Promise<void>
