import { z } from 'zod'

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  plants: z.string().optional(), // Comma-separated list of plant codes
  storageLocations: z.string().optional(), // Comma-separated list
  baseUnits: z.string().optional(), // Comma-separated list (EA, KG, EU)
})

export type InventoryQuery = z.infer<typeof inventoryQuerySchema>
