import { type Role, users } from '@repo/db'
import { and, asc, count, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { hashPassword } from '../../lib/utils/crypto'
import type { UsersQueries } from './schemas'

export async function listUsers() {
  return (
    db
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
      .orderBy(sql`(${users.passwordHash} IS NULL) DESC`, asc(users.email))
  )
}

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
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

export async function deleteUsers(ids: string[]) {
  if (ids.length === 0) return
  await db.delete(users).where(inArray(users.id, ids))
}

export async function setUsersRole(ids: string[], role: Role) {
  if (ids.length === 0) return
  await db.update(users).set({ role, status: 'active' }).where(inArray(users.id, ids))
}

export async function updateUser(
  userId: string,
  data: {
    email?: string
    givenName?: string
    familyName?: string
    role?: Role
    status?: 'active' | 'inactive' | 'pending'
  },
) {
  const [user] = await db.update(users).set(data).where(eq(users.id, userId)).returning()
  return user
}

export async function createNewUser(data: {
  email: string
  password?: string
  givenName?: string
  familyName?: string
  role?: Role
  status?: 'active' | 'inactive' | 'pending'
}) {
  const passwordHash = data.password ? await hashPassword(data.password) : null

  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: data.email,
      passwordHash,
      givenName: data.givenName,
      familyName: data.familyName,
      role: data.role,
      status: data.status,
    })
    .returning()

  return user
}

export async function getAdminEmails(): Promise<string[]> {
  const admins = await db.select({ email: users.email }).from(users).where(eq(users.role, 'admin'))
  return admins.map((a) => a.email)
}

export async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) return []
  return db.select({ id: users.id, email: users.email, status: users.status }).from(users).where(inArray(users.id, ids))
}
