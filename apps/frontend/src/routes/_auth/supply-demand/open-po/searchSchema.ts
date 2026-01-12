import { z } from 'zod'

/**
 * Search schema for Open PO page.
 * Used with TanStack Router's validateSearch.
 *
 * URL format examples:
 * - /supply-demand/open-po?page=2&plants=Plant1,Plant2&sort=nextScheduleLineDate.desc
 * - /supply-demand/open-po?orderTypes=NB&suppliers=Supplier1
 */
export const openPoSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),

  // Search
  search: z.string().optional(),

  // Multi-select filters (comma-separated in URL)
  plants: z.string().optional(),
  orderTypes: z.string().optional(),
  suppliers: z.string().optional(),

  // Sorting (format: "columnId.asc" or "columnId.desc")
  sort: z.string().optional(),
})

export type OpenPoSearch = z.infer<typeof openPoSearchSchema>

/** Default values for resetting filters */
export const openPoSearchDefaults: OpenPoSearch = {
  page: 1,
  pageSize: 25,
  search: undefined,
  plants: undefined,
  orderTypes: undefined,
  suppliers: undefined,
  sort: undefined,
}
