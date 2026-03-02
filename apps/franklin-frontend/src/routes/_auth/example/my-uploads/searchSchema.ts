import { z } from 'zod'

/**
 * Search schema for My Uploads page.
 * Used with TanStack Router's validateSearch.
 */
export const myUploadsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  types: z.string().optional(), // comma-separated upload types
  sort: z.string().optional(),
  validationStatus: z.enum(['valid', 'invalid']).optional(),
})

export type MyUploadsSearch = z.infer<typeof myUploadsSearchSchema>

export const myUploadsSearchDefaults: MyUploadsSearch = {
  page: 1,
  pageSize: 20,
  search: undefined,
  types: undefined,
  sort: 'createdAt.desc',
  validationStatus: undefined,
}
