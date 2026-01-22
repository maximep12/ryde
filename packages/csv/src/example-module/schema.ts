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

export const clientsSchema = z.object({
  client_code: z.string(),
  store_name: z.string(),
  store_type: z.string(),
  email: z.string(),
  city: z.string(),
})

export type ClientsCsvRow = z.infer<typeof clientsSchema>
