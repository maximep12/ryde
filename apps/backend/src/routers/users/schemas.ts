import { z } from 'zod'

export const usersQueriesSchema = z.object({
  keyword: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
})

export const upsertUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  fallbackName: z.string().optional(),
})

export type UsersQueries = z.infer<typeof usersQueriesSchema>
export type UpsertUser = z.infer<typeof upsertUserSchema>
