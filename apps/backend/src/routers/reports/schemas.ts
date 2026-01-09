import { z } from 'zod'

export const reportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  plantNames: z.string().optional(), // Comma-separated list of plant names
  riskLevels: z.string().optional(), // Comma-separated list of risk levels (high, medium, low)
  productStatuses: z.string().optional(), // Comma-separated list of product statuses (03, 04, 05)
  nextProblemPeriod: z.string().optional(), // Format: YYYY-MM (filters items with firstProblemDate in this month)
  status: z.enum(['all', 'problems', 'ok']).default('all'), // Quick filter
  sortBy: z.string().optional(), // Column to sort by
  sortOrder: z.enum(['asc', 'desc']).optional(), // Sort direction
})

export type ReportsQuery = z.infer<typeof reportsQuerySchema>

export const reportDetailParamsSchema = z.object({
  plantName: z.string(),
  materialNumber: z.string(),
})

export type ReportDetailParams = z.infer<typeof reportDetailParamsSchema>

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content is too long'),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content is too long'),
})

export const commentParamsSchema = z.object({
  plantName: z.string(),
  materialNumber: z.string(),
  commentId: z.coerce.number().int().positive(),
})
