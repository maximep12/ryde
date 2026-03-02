import { z } from 'zod'

// Helper to parse string "true"/"false" to boolean
const stringBoolean = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .default(defaultValue ? 'true' : 'false')
    .transform((val) => val === 'true')

export const usersQueriesSchema = z.object({
  search: z.string().optional(),
  departments: z.string().optional(), // comma-separated list
  showActive: stringBoolean(true),
  showInactive: stringBoolean(true),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20),
})

export const upsertUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
})

export type UsersQueries = z.infer<typeof usersQueriesSchema>
export type UpsertUser = z.infer<typeof upsertUserSchema>
