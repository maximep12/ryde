import { InferSelectModel, sql } from 'drizzle-orm'
import { boolean, index, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

export const DEPARTMENTS = [
  'finance',
  'procurement',
  'production_planning',
  'manufacturing',
  'customer_service',
  'it',
  'external',
] as const

export type Department = (typeof DEPARTMENTS)[number]

export const users = app.table(
  'users',
  {
    id: varchar('id').primaryKey(),
    email: varchar('email').unique().notNull(),
    passwordHash: varchar('password_hash'),
    givenName: varchar('given_name'),
    familyName: varchar('family_name'),
    department: varchar('department', { length: 50 }).$type<Department>(),
    isActive: boolean('is_active').default(true),
    ...timestamps,
  },
  (table) => {
    return [index('users_email_idx').on(table.email)]
  },
)

export type User = InferSelectModel<typeof users>

export const usersSessions = app.table(
  'users_sessions',
  {
    userId: varchar('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sessionToken: varchar('session_token').notNull(),
    accessToken: varchar('access_token'),
    refreshToken: varchar('refresh_token'),
    expiresAt: timestamp('expires_at')
      .notNull()
      .default(sql`now() + INTERVAL '20 minutes'`),
    ...timestamps,
  },
  (table) => {
    return [
      primaryKey({ columns: [table.userId, table.sessionToken] }),
      index('users_sessions_user_id_idx').on(table.userId),
      index('users_sessions_session_token_idx').on(table.sessionToken),
    ]
  },
)
