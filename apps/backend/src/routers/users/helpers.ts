import { users, usersSessions } from '@repo/db'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { UpsertUser } from './schemas'

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return user
}

export async function getUsers(page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize
  return db.select().from(users).limit(pageSize).offset(offset)
}

export async function createUser(newUser: UpsertUser) {
  const [user] = await db
    .insert(users)
    .values({
      id: newUser.id,
      email: newUser.email,
      givenName: newUser.givenName,
      familyName: newUser.familyName,
      fallbackName: newUser.fallbackName,
    })
    .onConflictDoNothing()
    .returning()

  return user
}

export async function updateUser(updatedUser: UpsertUser) {
  const [user] = await db
    .update(users)
    .set({
      email: updatedUser.email,
      givenName: updatedUser.givenName,
      familyName: updatedUser.familyName,
      fallbackName: updatedUser.fallbackName,
    })
    .where(eq(users.id, updatedUser.id))
    .returning()

  return user
}

export function disableUser(userId: string) {
  return db.update(users).set({ isActive: false }).where(eq(users.id, userId))
}

export function activateUser(userId: string) {
  return db.update(users).set({ isActive: true }).where(eq(users.id, userId))
}

export async function getUserFromSessionToken(sessionToken: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      givenName: users.givenName,
      familyName: users.familyName,
    })
    .from(users)
    .innerJoin(usersSessions, eq(users.id, usersSessions.userId))
    .where(eq(usersSessions.sessionToken, sessionToken))
    .limit(1)

  return user ?? null
}
