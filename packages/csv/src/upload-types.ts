import { z } from 'zod'
import {
  EXAMPLE_MODULE_HEADERS,
  EXAMPLE_MODULE_UPLOAD_TYPE_LABELS,
  EXAMPLE_MODULE_UPLOAD_TYPE_S3_PATHS,
  EXAMPLE_MODULE_UPLOAD_TYPES,
} from './example-module'

// =============================================================================
// CSV UPLOAD TYPES
// Aggregates all upload types from all modules
// =============================================================================

export const UPLOAD_TYPES = [...EXAMPLE_MODULE_UPLOAD_TYPES] as const
export type UploadType = (typeof UPLOAD_TYPES)[number]
export const uploadTypesSchema = z.enum(UPLOAD_TYPES)

// =============================================================================
// AGGREGATED LOOKUPS
// Combine all module-specific labels and headers for generic component usage
// =============================================================================

export const CSV_UPLOAD_TYPE_LABELS: Record<UploadType, string> = {
  ...EXAMPLE_MODULE_UPLOAD_TYPE_LABELS,
}

export const CSV_HEADERS: Record<UploadType, readonly string[]> = {
  ...EXAMPLE_MODULE_HEADERS,
}

export const CSV_UPLOAD_TYPE_S3_PATHS: Record<UploadType, string> = {
  ...EXAMPLE_MODULE_UPLOAD_TYPE_S3_PATHS,
}

export const UPLOAD_REPORT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
} as const

export type UploadReportStatus = (typeof UPLOAD_REPORT_STATUS)[keyof typeof UPLOAD_REPORT_STATUS]
