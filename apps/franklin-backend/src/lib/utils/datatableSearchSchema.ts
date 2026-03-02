import { z } from 'zod'

/**
 * Parses a sort string like 'createdAt.desc' into { id, desc } object
 */
const sortStringSchema = z
  .string()
  .transform((val) => {
    if (!val) return undefined
    const lastDotIndex = val.lastIndexOf('.')
    if (lastDotIndex === -1) return undefined
    const id = val.slice(0, lastDotIndex)
    const direction = val.slice(lastDotIndex + 1)
    if (!id || (direction !== 'asc' && direction !== 'desc')) return undefined
    return { id, desc: direction === 'desc' }
  })
  .optional()

/**
 * Common schema for datatable/list queries with pagination and sorting
 */
export const datatableSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: sortStringSchema,
})

export type DatatableSearchParams = z.infer<typeof datatableSearchSchema>
