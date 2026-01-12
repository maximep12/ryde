import { z } from 'zod'

/**
 * Search schema for One Line S&D page.
 * Used with TanStack Router's validateSearch.
 *
 * URL format examples:
 * - /supply-demand/one-line-sd?page=2&plantNames=Plant1,Plant2&sort=safetyStock.desc
 * - /supply-demand/one-line-sd?materialGroups=MG01&purchasingGroups=PG01,PG02
 */
export const oneLineSdSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),

  // Search
  search: z.string().optional(),

  // Multi-select filters (comma-separated in URL)
  plantNames: z.string().optional(),
  materialGroups: z.string().optional(),
  purchasingGroups: z.string().optional(),

  // Sorting (format: "columnId.asc" or "columnId.desc")
  sort: z.string().optional(),
})

export type OneLineSdSearch = z.infer<typeof oneLineSdSearchSchema>

/** Default values for resetting filters */
export const oneLineSdSearchDefaults: OneLineSdSearch = {
  page: 1,
  pageSize: 25,
  search: undefined,
  plantNames: undefined,
  materialGroups: undefined,
  purchasingGroups: undefined,
  sort: undefined,
}
