import { type Role, users } from '@repo/db'
import { asc, inArray, sql } from 'drizzle-orm'
import { db } from '../../db'

export async function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      givenName: users.givenName,
      familyName: users.familyName,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    // Pending users (no password set) first, then alphabetical by email
    .orderBy(
      sql`(${users.passwordHash} IS NULL) DESC`,
      asc(users.email),
    )
}

export async function deleteUsers(ids: string[]) {
  if (ids.length === 0) return
  await db.delete(users).where(inArray(users.id, ids))
}

export async function setUsersRole(ids: string[], role: Role) {
  if (ids.length === 0) return
  await db.update(users).set({ role }).where(inArray(users.id, ids))
}
