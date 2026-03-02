import { products } from '@repo/db'
import { and, asc, count, desc, ilike, or, type SQL } from 'drizzle-orm'
import { db } from '../../db'
import type { ProductsQuery } from './schemas'

// Map column names to product table columns
const sortableColumns = {
  name: products.name,
  description: products.description,
} as const

export async function getProducts(query: ProductsQuery) {
  const { page, pageSize, search, sortBy, sortOrder } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(ilike(products.name, searchPattern), ilike(products.description, searchPattern)),
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Build order by clause
  let orderByClause: SQL | undefined
  if (sortBy && sortBy in sortableColumns) {
    const column = sortableColumns[sortBy as keyof typeof sortableColumns]
    orderByClause = sortOrder === 'desc' ? desc(column) : asc(column)
  } else {
    orderByClause = asc(products.name)
  }

  // Get items
  const items = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset)

  // Get total count
  const [countResult] = await db.select({ count: count() }).from(products).where(whereClause)

  const total = countResult?.count ?? 0

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
