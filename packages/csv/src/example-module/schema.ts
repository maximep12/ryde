import { z } from 'zod'

// =============================================================================
// PRODUCTS CSV SCHEMA
// Minimal example: 3 columns for product catalog import
// =============================================================================

export const productsSchema = z.object({
  product_code: z.string(),
  description: z.string(),
  product_type: z.string(),
})

export type ProductsCsvRow = z.infer<typeof productsSchema>

// =============================================================================
// CLIENTS CSV SCHEMA
// Minimal example: 4 columns for client/customer import
// =============================================================================

export const clientsSchema = z.object({
  client_code: z.string(),
  store_name: z.string(),
  email: z.string().email(),
  city: z.string(),
})

export type ClientsCsvRow = z.infer<typeof clientsSchema>
