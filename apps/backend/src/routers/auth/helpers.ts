import { AUTHORIZATION_HEADER_PREFIX, MESSAGE } from '@repo/constants'
import { users, usersSessions } from '@repo/db'
import { FEATURE_FLAGS_ENV } from '@repo/feature-flags'
import { eq, InferSelectModel, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../../db'
import { generateToken } from '../../lib/utils/crypto'
import { env } from '../../lib/utils/env'

const featureFlags = FEATURE_FLAGS_ENV[env.ENV]

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  return user
}

export const isSessionExpired = (session: InferSelectModel<typeof usersSessions>) => {
  if (featureFlags['infinite-user-sessions']) {
    return false
  }
  return session.expiresAt < new Date()
}

export async function findSession(sessionToken: string) {
  const [session] = await db
    .select()
    .from(usersSessions)
    .where(eq(usersSessions.sessionToken, sessionToken))
    .limit(1)

  return session
}

export async function createSession(userId: string, accessToken: string, refreshToken: string) {
  const sessionToken = generateToken()

  const expiresAt = featureFlags['infinite-user-sessions']
    ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
    : new Date(Date.now() + 20 * 60 * 1000) // 20 minutes

  const [session] = await db
    .insert(usersSessions)
    .values({
      userId,
      sessionToken,
      accessToken,
      refreshToken,
      expiresAt,
    })
    .returning()

  if (!session) throw new HTTPException(500, { message: MESSAGE.SESSION_CREATION_FAILED })
  return session
}

export function deleteSession(sessionToken: string) {
  return db.delete(usersSessions).where(eq(usersSessions.sessionToken, sessionToken))
}

export async function extendSession(
  sessionToken: string,
  accessToken: string,
  refreshToken: string,
) {
  const interval = featureFlags['infinite-user-sessions']
    ? sql`now() + INTERVAL '100 years'`
    : sql`now() + INTERVAL '20 minutes'`

  return db
    .update(usersSessions)
    .set({
      accessToken,
      refreshToken,
      expiresAt: interval,
      updatedAt: sql`now()`,
    })
    .where(eq(usersSessions.sessionToken, sessionToken))
}

export const extractSessionTokenFromAuth = (authorization: string) => {
  const [, sessionToken] = authorization.split(AUTHORIZATION_HEADER_PREFIX)
  return sessionToken
}

export const getSessionSchema = z.object({
  sessionToken: z.string(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
