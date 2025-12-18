import {
  clientAssortments,
  clientComments,
  clientExchanges,
  clientOrderItems,
  clientOrders,
  clients,
  users,
} from '@repo/db'
import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '../../../db'
import { ClientQuery, ClientSearch } from './schemas'

// ============================================================================
// CLIENTS HELPERS
// ============================================================================

export async function searchClients(query: ClientSearch) {
  const { search, limit } = query
  const searchPattern = `%${search}%`

  return db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      companyName: clients.companyName,
      status: clients.status,
    })
    .from(clients)
    .where(
      or(
        ilike(clients.firstName, searchPattern),
        ilike(clients.lastName, searchPattern),
        ilike(clients.email, searchPattern),
        ilike(clients.phone, searchPattern),
        ilike(clients.companyName, searchPattern),
        ilike(clients.clientCode, searchPattern),
      ),
    )
    .limit(limit)
}

export async function getClients(query: ClientQuery) {
  const { page, pageSize, search, status, company } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(clients.firstName, searchPattern),
        ilike(clients.lastName, searchPattern),
        ilike(clients.email, searchPattern),
        ilike(clients.phone, searchPattern),
        ilike(clients.companyName, searchPattern),
        ilike(clients.clientCode, searchPattern),
      ),
    )
  }

  if (status) {
    conditions.push(eq(clients.status, status))
  }

  if (company) {
    conditions.push(ilike(clients.companyName, `%${company}%`))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(clients)
      .where(whereClause)
      .orderBy(desc(clients.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(clients).where(whereClause),
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

export async function getClientById(id: number) {
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  return client ?? null
}

// ============================================================================
// ORDERS HELPERS
// ============================================================================

export async function getClientOrders(clientId: number, limit = 11) {
  return db
    .select()
    .from(clientOrders)
    .where(eq(clientOrders.clientId, clientId))
    .orderBy(desc(clientOrders.orderDate))
    .limit(limit)
}

export async function getOrderById(orderId: number) {
  const [order] = await db.select().from(clientOrders).where(eq(clientOrders.id, orderId)).limit(1)
  return order ?? null
}

export async function getOrderItems(orderId: number) {
  return db.select().from(clientOrderItems).where(eq(clientOrderItems.orderId, orderId))
}

// ============================================================================
// EXCHANGES HELPERS
// ============================================================================

export async function getClientExchanges(clientId: number) {
  return db
    .select()
    .from(clientExchanges)
    .where(eq(clientExchanges.clientId, clientId))
    .orderBy(desc(clientExchanges.exchangeDate))
}

// ============================================================================
// ASSORTMENTS HELPERS
// ============================================================================

export async function getClientAssortments(clientId: number) {
  return db
    .select()
    .from(clientAssortments)
    .where(eq(clientAssortments.clientId, clientId))
    .orderBy(desc(clientAssortments.purchaseDate))
}

// ============================================================================
// COMMENTS HELPERS
// ============================================================================

export async function getClientComments(clientId: number) {
  return db
    .select({
      id: clientComments.id,
      clientId: clientComments.clientId,
      userId: clientComments.userId,
      content: clientComments.content,
      createdAt: clientComments.createdAt,
      updatedAt: clientComments.updatedAt,
      author: {
        id: users.id,
        givenName: users.givenName,
        familyName: users.familyName,
        email: users.email,
      },
    })
    .from(clientComments)
    .innerJoin(users, eq(clientComments.userId, users.id))
    .where(eq(clientComments.clientId, clientId))
    .orderBy(desc(clientComments.createdAt))
}

export async function createClientComment(clientId: number, userId: string, content: string) {
  const [comment] = await db
    .insert(clientComments)
    .values({ clientId, userId, content })
    .returning()
  return comment
}

export async function updateClientComment(commentId: number, userId: string, content: string) {
  const [comment] = await db
    .update(clientComments)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(clientComments.id, commentId), eq(clientComments.userId, userId)))
    .returning()
  return comment ?? null
}

export async function deleteClientComment(commentId: number, userId: string) {
  const [comment] = await db
    .delete(clientComments)
    .where(and(eq(clientComments.id, commentId), eq(clientComments.userId, userId)))
    .returning()
  return comment ?? null
}
