import { z } from 'zod'

/**
 * Search schema for Forecasts page.
 * Used with TanStack Router's validateSearch.
 *
 * URL format examples:
 * - /supply-demand/forecasts?page=2&regions=EMEA&sort=sales.desc
 * - /supply-demand/forecasts?brands=BrandA,BrandB&negativeSales=true
 */
export const forecastsSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),

  // Search
  search: z.string().optional(),

  // Multi-select filters (comma-separated in URL)
  regions: z.string().optional(),
  countries: z.string().optional(),
  brands: z.string().optional(),
  plants: z.string().optional(),
  years: z.string().optional(),
  months: z.string().optional(),

  // Boolean/enum filters
  negativeSales: z.coerce.boolean().optional(),
  positiveSales: z.coerce.boolean().optional(),
  clientStatus: z.enum(['active', 'inactive']).optional(),

  // Sorting (format: "columnId.asc" or "columnId.desc")
  sort: z.string().optional(),
})

export type ForecastsSearch = z.infer<typeof forecastsSearchSchema>

/** Default values for resetting filters */
export const forecastsSearchDefaults: ForecastsSearch = {
  page: 1,
  pageSize: 25,
  search: undefined,
  regions: undefined,
  countries: undefined,
  brands: undefined,
  plants: undefined,
  years: undefined,
  months: undefined,
  negativeSales: undefined,
  positiveSales: undefined,
  clientStatus: undefined,
  sort: undefined,
}
