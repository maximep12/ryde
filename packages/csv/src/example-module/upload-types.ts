import { z } from 'zod'

// =============================================================================
// EXAMPLE MODULE UPLOAD TYPES
// Define all CSV upload types for this module
// =============================================================================

export const EXAMPLE_MODULE_CSV_UPLOAD_TYPES = ['products', 'clients'] as const

export type ExampleModuleCsvUploadType = (typeof EXAMPLE_MODULE_CSV_UPLOAD_TYPES)[number]

export const EXAMPLE_MODULE_CSV_UPLOAD_TYPE_LABELS: Record<ExampleModuleCsvUploadType, string> = {
  products: 'Products',
  clients: 'Clients',
}

export const exampleModuleCsvUploadTypesSchema = z.enum(EXAMPLE_MODULE_CSV_UPLOAD_TYPES)

const S3_PATH_PREFIX = 'example-module/'

export const EXAMPLE_MODULE_CSV_UPLOAD_TYPE_S3_PATHS: Record<ExampleModuleCsvUploadType, string> = {
  products: `${S3_PATH_PREFIX}products`,
  clients: `${S3_PATH_PREFIX}clients`,
} as const
