import { z } from 'zod'

export const oneLineSdQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  plantNames: z.string().optional(), // Comma-separated list of plant names
  materialGroups: z.string().optional(), // Comma-separated list
  purchasingGroups: z.string().optional(), // Comma-separated list
  sortBy: z.string().optional(), // Column to sort by
  sortOrder: z.enum(['asc', 'desc']).optional(), // Sort direction
})

export type OneLineSdQuery = z.infer<typeof oneLineSdQuerySchema>
