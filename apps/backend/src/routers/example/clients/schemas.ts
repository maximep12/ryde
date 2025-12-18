import { z } from 'zod'

// ============================================================================
// CLIENTS SCHEMAS
// ============================================================================

export const clientSearchSchema = z.object({
  search: z.string().min(3).max(100),
  limit: z.coerce.number().int().positive().max(10).default(10),
})

export const clientQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  company: z.string().optional(),
})

export type ClientSearch = z.infer<typeof clientSearchSchema>
export type ClientQuery = z.infer<typeof clientQuerySchema>

// ============================================================================
// COMMENTS SCHEMAS
// ============================================================================

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export type CreateComment = z.infer<typeof createCommentSchema>
export type UpdateComment = z.infer<typeof updateCommentSchema>
