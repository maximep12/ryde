import { AUTHORIZATION_HEADER_PREFIX } from '@repo/constants'
import { usersSessions } from '@repo/db'
import { eq, InferSelectModel, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { generateToken } from '../../lib/utils/crypto'

export const isSessionExpired = (session: InferSelectModel<typeof usersSessions>) =>
  session.expiresAt < new Date()

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

  const [session] = await db
    .insert(usersSessions)
    .values({
      userId,
      sessionToken,
      accessToken,
      refreshToken,
    })
    .returning()

  if (!session) throw new Error('Session could not be created')
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
  return db
    .update(usersSessions)
    .set({
      accessToken,
      refreshToken,
      expiresAt: sql`now() + INTERVAL '30 minutes'`,
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
