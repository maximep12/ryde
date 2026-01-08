import { z } from 'zod'

export const productsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  productTypes: z.string().optional(), // Comma-separated list
  productGroups: z.string().optional(), // Comma-separated list
  statuses: z.string().optional(), // Comma-separated list (03, 04, 05)
})

export type ProductsQuery = z.infer<typeof productsQuerySchema>
