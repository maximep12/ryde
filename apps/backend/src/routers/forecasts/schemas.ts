import { z } from 'zod'

export const forecastsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  regions: z.string().optional(), // Comma-separated list
  countries: z.string().optional(), // Comma-separated list (CAN, US)
  brands: z.string().optional(), // Comma-separated list
  plants: z.string().optional(), // Comma-separated list
  years: z.string().optional(), // Comma-separated list
  months: z.string().optional(), // Comma-separated list
  negativeSalesOnly: z.coerce.boolean().optional(), // Filter for negative sales
  positiveSalesOnly: z.coerce.boolean().optional(), // Filter for positive sales
  clientStatus: z.enum(['active', 'inactive']).optional(), // Filter by client status
  sortBy: z.string().optional(), // Column to sort by
  sortOrder: z.enum(['asc', 'desc']).optional(), // Sort direction
})

export type ForecastsQuery = z.infer<typeof forecastsQuerySchema>
