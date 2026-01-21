import {
  EXAMPLE_MODULE_CSV_HEADERS,
  EXAMPLE_MODULE_CSV_UPLOAD_TYPE_LABELS,
  EXAMPLE_MODULE_CSV_UPLOAD_TYPE_S3_PATHS,
  EXAMPLE_MODULE_CSV_UPLOAD_TYPES,
} from './example-module'

// =============================================================================
// CSV UPLOAD TYPES
// Aggregates all upload types from all modules
// =============================================================================

export const CSV_UPLOAD_TYPES = [...EXAMPLE_MODULE_CSV_UPLOAD_TYPES] as const
export type CsvUploadType = (typeof CSV_UPLOAD_TYPES)[number]

// =============================================================================
// AGGREGATED LOOKUPS
// Combine all module-specific labels and headers for generic component usage
// =============================================================================

export const CSV_UPLOAD_TYPE_LABELS: Record<CsvUploadType, string> = {
  ...EXAMPLE_MODULE_CSV_UPLOAD_TYPE_LABELS,
}

export const CSV_HEADERS: Record<CsvUploadType, readonly string[]> = {
  ...EXAMPLE_MODULE_CSV_HEADERS,
}

export const CSV_UPLOAD_TYPE_S3_PATHS: Record<CsvUploadType, string> = {
  ...EXAMPLE_MODULE_CSV_UPLOAD_TYPE_S3_PATHS,
}

export const UPLOAD_REPORT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
} as const

export type UploadReportStatus = (typeof UPLOAD_REPORT_STATUS)[keyof typeof UPLOAD_REPORT_STATUS]
