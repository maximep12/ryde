import { getSchemaKeys } from '@repo/zod-schemas'
import { clientsSchema, productsSchema } from './schema'
import { ExampleModuleCsvUploadType } from './upload-types'

// =============================================================================
// CSV HEADERS
// Auto-extracted from schemas for template generation and validation
// =============================================================================

const productsHeaders = getSchemaKeys(productsSchema)
const clientsHeaders = getSchemaKeys(clientsSchema)

export const EXAMPLE_MODULE_CSV_HEADERS = {
  products: productsHeaders,
  clients: clientsHeaders,
} satisfies Record<ExampleModuleCsvUploadType, readonly string[]>

export type ProductsCsvHeader = (typeof EXAMPLE_MODULE_CSV_HEADERS)['products'][number]
export type ClientsCsvHeader = (typeof EXAMPLE_MODULE_CSV_HEADERS)['clients'][number]
