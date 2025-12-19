import { type Department, users, usersSessions } from '@repo/db'
import { and, count, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { UpsertUser, UsersQueries } from './schemas'

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return user
}

export async function getUsers(query: UsersQueries) {
  const { search, departments, showActive, showInactive, page, pageSize } = query
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

  // Filter by departments
  if (departments) {
    const departmentList = departments.split(',').filter(Boolean) as Department[]
    if (departmentList.length === 1) {
      conditions.push(eq(users.department, departmentList[0]!))
    } else if (departmentList.length > 1) {
      conditions.push(or(...departmentList.map((d) => eq(users.department, d))))
    }
  }

  // Filter by active status
  if (showActive && !showInactive) {
    conditions.push(eq(users.isActive, true))
  } else if (!showActive && showInactive) {
    conditions.push(eq(users.isActive, false))
  } else if (!showActive && !showInactive) {
    // If both are false, show nothing (impossible condition)
    conditions.push(sql`1 = 0`)
  }
  // If both are true, no filter needed (show all)

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

export async function createUser(newUser: UpsertUser) {
  const [user] = await db
    .insert(users)
    .values({
      id: newUser.id,
      email: newUser.email,
      givenName: newUser.givenName,
      familyName: newUser.familyName,
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
