import { ROLES, STATUSES } from '@repo/db'
import { z } from 'zod'

const BATCH_KEYS = [...ROLES, 'Deleted'] as const

// { "admin": ["uuid1", "uuid2"], "trade_rep": ["uuid3"], "Deleted": ["uuid4"] }
export const batchUpdateSchema = z.record(z.enum(BATCH_KEYS), z.array(z.string()))

const stringBoolean = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .default(defaultValue ? 'true' : 'false')
    .transform((val) => val === 'true')

export const usersQueriesSchema = z.object({
  search: z.string().optional(),
  showActive: stringBoolean(true),
  showInactive: stringBoolean(true),
  showPending: stringBoolean(true),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20),
})

export const upsertUserSchema = z.object({
  email: z.string().email().optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional().default('pending'),
})

export type UsersQueries = z.infer<typeof usersQueriesSchema>
