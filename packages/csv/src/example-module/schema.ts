import { z } from 'zod'

// =============================================================================
// PRODUCTS CSV SCHEMA
// For importing new products into the catalog
// =============================================================================

export const productsSchema = z.object({
  product_code: z.string(),
  description: z.string(),
  product_type: z.string(),
})

export type ProductsCsvRow = z.infer<typeof productsSchema>

// =============================================================================
// CLIENTS CSV SCHEMA
// For importing new clients
// =============================================================================

const validStoreTypes = [
  'grocery',
  'corner_store',
  'pharmacy',
  'convenience_store',
  'supermarket',
] as const

export const clientsSchema = z.object({
  client_code: z
    .string()
    .min(1, 'Client code is required')
    .regex(/^[A-Z0-9-]+$/, 'Client code must contain only uppercase letters, numbers, and hyphens'),
  store_name: z.string().min(1, 'Store name is required'),
  store_type: z.enum(validStoreTypes, {
    message: `Store type must be one of: ${validStoreTypes.join(', ')}`,
  }),
  email: z.string().email('Invalid email format'),
  city: z.string().min(1, 'City is required'),
})

export type ClientsCsvRow = z.infer<typeof clientsSchema>
