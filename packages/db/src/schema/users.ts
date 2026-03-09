import { InferSelectModel, sql } from 'drizzle-orm'
import { index, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

export const ROLES = ['admin', 'data_manager', 'trade_rep'] as const
export type Role = (typeof ROLES)[number]

export const STATUSES = ['active', 'inactive', 'pending'] as const
export type Status = (typeof STATUSES)[number]

export const users = app.table(
  'users',
  {
    id: varchar('id').primaryKey(),
    email: varchar('email').unique().notNull(),
    passwordHash: varchar('password_hash'),
    givenName: varchar('given_name'),
    familyName: varchar('family_name'),
    status: varchar('status').$type<Status>().default('active'),
    role: varchar('role').$type<Role>(),
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
