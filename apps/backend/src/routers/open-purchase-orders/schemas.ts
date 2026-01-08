import { z } from 'zod'

export const openPurchaseOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  plants: z.string().optional(), // Comma-separated list of plant names
  orderTypes: z.string().optional(), // Comma-separated list
  suppliers: z.string().optional(), // Comma-separated list
})

export type OpenPurchaseOrdersQuery = z.infer<typeof openPurchaseOrdersQuerySchema>
