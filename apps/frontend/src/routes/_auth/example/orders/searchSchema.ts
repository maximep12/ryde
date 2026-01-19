import { z } from 'zod'

/**
 * Search schema for Orders Monitor page.
 * Used with TanStack Router's validateSearch.
 *
 * URL format examples:
 * - /orders?page=2&statuses=pending,shipped&sort=orderDate.desc
 * - /orders?search=ABC&hasIssues=true&date=2024-01-15
 */
export const ordersSearchSchema = z.object({
  // Pagination (optional with defaults)
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(15),

  // Search
  search: z.string().optional(),

  // Date filter (YYYY-MM-DD format)
  date: z.string().optional(),

  // Multi-select filters (comma-separated in URL)
  statuses: z.string().optional(),
  sources: z.string().optional(),

  // Boolean filters (only appear in URL when true)
  hasIssues: z.coerce.boolean().optional(),
  hasResolvedIssues: z.coerce.boolean().optional(),
  requiresApproval: z.coerce.boolean().optional(),
  wasApproved: z.coerce.boolean().optional(),

  // Sorting (format: "columnId.asc" or "columnId.desc")
  sort: z.string().optional(),
})

export type OrdersSearch = z.infer<typeof ordersSearchSchema>

/** Default values for resetting filters */
export const ordersSearchDefaults: OrdersSearch = {
  page: 1,
  pageSize: 15,
  search: undefined,
  date: undefined,
  statuses: undefined,
  sources: undefined,
  hasIssues: undefined,
  hasResolvedIssues: undefined,
  requiresApproval: undefined,
  wasApproved: undefined,
  sort: undefined,
}
