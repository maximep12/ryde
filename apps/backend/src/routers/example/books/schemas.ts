import { z } from 'zod'

// ============================================================================
// BOOKS SCHEMAS
// ============================================================================

export const createBookSchema = z.object({
  title: z.string().min(1).max(255),
  author: z.string().min(1).max(255),
  isbn: z.string().length(13).optional(),
  description: z.string().optional(),
  publishedYear: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
  genre: z.string().max(100).optional(),
  pageCount: z.number().int().positive().optional(),
  coverImageUrl: z.string().url().optional(),
})

export const updateBookSchema = createBookSchema.partial()

export const bookQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  genre: z.string().optional(),
  author: z.string().optional(),
})

export type CreateBook = z.infer<typeof createBookSchema>
export type UpdateBook = z.infer<typeof updateBookSchema>
export type BookQuery = z.infer<typeof bookQuerySchema>

// ============================================================================
// REVIEWS SCHEMAS
// ============================================================================

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().optional(),
})

export const updateReviewSchema = createReviewSchema.partial()

export type CreateReview = z.infer<typeof createReviewSchema>
export type UpdateReview = z.infer<typeof updateReviewSchema>
