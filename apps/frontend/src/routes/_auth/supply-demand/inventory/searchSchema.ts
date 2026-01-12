import { z } from 'zod'

/**
 * Search schema for Inventory page.
 * Used with TanStack Router's validateSearch.
 *
 * URL format examples:
 * - /supply-demand/inventory?page=2&plants=1000,2000&sort=unrestrictedStock.desc
 * - /supply-demand/inventory?storageLocations=WH01&baseUnits=EA,KG
 */
export const inventorySearchSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),

  // Search
  search: z.string().optional(),

  // Multi-select filters (comma-separated in URL)
  plants: z.string().optional(),
  storageLocations: z.string().optional(),
  baseUnits: z.string().optional(),

  // Sorting (format: "columnId.asc" or "columnId.desc")
  sort: z.string().optional(),
})

export type InventorySearch = z.infer<typeof inventorySearchSchema>

/** Default values for resetting filters */
export const inventorySearchDefaults: InventorySearch = {
  page: 1,
  pageSize: 25,
  search: undefined,
  plants: undefined,
  storageLocations: undefined,
  baseUnits: undefined,
  sort: undefined,
}
