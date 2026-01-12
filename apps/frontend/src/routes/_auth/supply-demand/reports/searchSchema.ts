import { z } from 'zod'

/**
 * Search schema for Reports page.
 * Used with TanStack Router's validateSearch.
 *
 * URL format examples:
 * - /supply-demand/reports?page=2&plants=NYC,LA&sort=risk.desc
 * - /supply-demand/reports?riskLevels=high,medium&needsValidation=true
 */
export const reportsSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),

  // Search
  search: z.string().optional(),

  // Multi-select filters (comma-separated in URL)
  plants: z.string().optional(),
  riskLevels: z.string().optional(),
  productStatuses: z.string().optional(),
  problemPeriods: z.string().optional(),

  // Boolean filters
  needsValidation: z.coerce.boolean().optional(),

  // Sorting (format: "columnId.asc" or "columnId.desc")
  sort: z.string().optional(),
})

export type ReportsSearch = z.infer<typeof reportsSearchSchema>

/** Default values for resetting filters */
export const reportsSearchDefaults: ReportsSearch = {
  page: 1,
  pageSize: 25,
  search: undefined,
  plants: undefined,
  riskLevels: undefined,
  productStatuses: undefined,
  problemPeriods: undefined,
  needsValidation: undefined,
  sort: undefined,
}
