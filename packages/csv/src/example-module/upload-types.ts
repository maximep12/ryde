import { z } from 'zod'

// =============================================================================
// EXAMPLE MODULE UPLOAD TYPES
// Define all CSV upload types for this module
// =============================================================================

export const EXAMPLE_MODULE_UPLOAD_TYPES = ['products', 'clients'] as const

export type ExampleModuleUploadType = (typeof EXAMPLE_MODULE_UPLOAD_TYPES)[number]

export const EXAMPLE_MODULE_UPLOAD_TYPE_LABELS: Record<ExampleModuleUploadType, string> = {
  products: 'Products',
  clients: 'Clients',
}

export const exampleModuleuploadTypesSchema = z.enum(EXAMPLE_MODULE_UPLOAD_TYPES)

const S3_PATH_PREFIX = 'example-module/'

export const EXAMPLE_MODULE_UPLOAD_TYPE_S3_PATHS: Record<ExampleModuleUploadType, string> = {
  products: `${S3_PATH_PREFIX}products`,
  clients: `${S3_PATH_PREFIX}clients`,
} as const
