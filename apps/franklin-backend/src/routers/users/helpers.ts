import { users, usersSessions } from '@repo/db'
import { and, count, eq, ilike, or, sql } from 'drizzle-orm'
import * as crypto from 'crypto'
import { db } from '../../db'
import { hashPassword } from '../../lib/utils/crypto'
import { CreateUser, UpsertUser, UsersQueries } from './schemas'

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return user
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return user
}

export async function getUsers(query: UsersQueries) {
  const { search, showActive, showInactive, showPending, page, pageSize } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(users.givenName, searchPattern),
        ilike(users.familyName, searchPattern),
        ilike(users.email, searchPattern),
      ),
    )
  }

  // Filter by status
  const allowedStatuses: string[] = []
  if (showActive) allowedStatuses.push('active')
  if (showInactive) allowedStatuses.push('inactive')
  if (showPending) allowedStatuses.push('pending')

  if (allowedStatuses.length === 0) {
    conditions.push(sql`1 = 0`)
  } else if (allowedStatuses.length < 3) {
    conditions.push(
      sql`${users.status} = ANY(ARRAY[${sql.raw(allowedStatuses.map((s) => `'${s}'`).join(','))}]::text[])`,
    )
  }
  // If all three are included, no filter needed (show all)

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db.select().from(users).where(whereClause).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(users).where(whereClause),
  ])

  const total = countResult[0]?.total ?? 0

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function createUser(newUser: CreateUser) {
  const passwordHash = newUser.password ? await hashPassword(newUser.password) : null

  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: newUser.email,
      passwordHash,
      givenName: newUser.givenName,
      familyName: newUser.familyName,
      role: newUser.role,
      status: newUser.status,
    })
    .returning()

  return user
}

export async function setPasswordAndActivate(userId: string, password: string) {
  const passwordHash = await hashPassword(password)
  const [user] = await db
    .update(users)
    .set({ passwordHash, status: 'active' })
    .where(eq(users.id, userId))
    .returning()
  return user
}

export async function updateUser(updatedUser: UpsertUser) {
  const [user] = await db
    .update(users)
    .set({
      ...(updatedUser.email !== undefined && { email: updatedUser.email }),
      givenName: updatedUser.givenName,
      familyName: updatedUser.familyName,
      role: updatedUser.role,
      status: updatedUser.status,
    })
    .where(eq(users.id, updatedUser.id))
    .returning()

  return user
}

export function disableUser(userId: string) {
  return db.update(users).set({ status: 'inactive' }).where(eq(users.id, userId))
}

export function activateUser(userId: string) {
  return db.update(users).set({ status: 'active' }).where(eq(users.id, userId))
}

export async function getUserFromSessionToken(sessionToken: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      givenName: users.givenName,
      familyName: users.familyName,
      role: users.role,
    })
    .from(users)
    .innerJoin(usersSessions, eq(users.id, usersSessions.userId))
    .where(eq(usersSessions.sessionToken, sessionToken))
    .limit(1)

  return user ?? null
}
