import { EXAMPLE_MODULE_CSV_UPLOAD_TYPES } from './example-module/upload-types'

// =============================================================================
// CSV UPLOAD TYPES
// Aggregates all upload types from all modules
// =============================================================================

export const CSV_UPLOAD_TYPES = [...EXAMPLE_MODULE_CSV_UPLOAD_TYPES] as const
export type CsvUploadType = (typeof CSV_UPLOAD_TYPES)[number]

export const UPLOAD_REPORT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
} as const

export type UploadReportStatus = (typeof UPLOAD_REPORT_STATUS)[keyof typeof UPLOAD_REPORT_STATUS]
