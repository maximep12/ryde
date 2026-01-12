import { z } from 'zod'

/**
 * Search schema for Product Status page.
 * Used with TanStack Router's validateSearch.
 *
 * URL format examples:
 * - /supply-demand/product-status?page=2&statuses=03,04&sort=productCode.desc
 * - /supply-demand/product-status?productTypes=FG&productGroups=ABC
 */
export const productStatusSearchSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),

  // Search
  search: z.string().optional(),

  // Multi-select filters (comma-separated in URL)
  productTypes: z.string().optional(),
  productGroups: z.string().optional(),
  statuses: z.string().optional(),

  // Sorting (format: "columnId.asc" or "columnId.desc")
  sort: z.string().optional(),
})

export type ProductStatusSearch = z.infer<typeof productStatusSearchSchema>

/** Default values for resetting filters */
export const productStatusSearchDefaults: ProductStatusSearch = {
  page: 1,
  pageSize: 25,
  search: undefined,
  productTypes: undefined,
  productGroups: undefined,
  statuses: undefined,
  sort: undefined,
}
