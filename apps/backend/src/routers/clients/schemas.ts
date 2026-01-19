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

// ============================================================================
// CREATE CLIENT SCHEMA
// ============================================================================

export const storeTypes = [
  'grocery',
  'corner_store',
  'pharmacy',
  'convenience_store',
  'supermarket',
] as const

export const createClientSchema = z.object({
  storeName: z.string().min(1).max(255),
  storeType: z.enum(storeTypes),
  contactName: z.string().max(200).optional(),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  billingAddress: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
})

export type CreateClient = z.infer<typeof createClientSchema>
