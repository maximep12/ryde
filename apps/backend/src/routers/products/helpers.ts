import { products } from '@repo/db'
import { and, count, countDistinct, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import type { ProductsQuery } from './schemas'

export async function getProducts(query: ProductsQuery) {
  const { page, pageSize, search, productTypes, productGroups, statuses } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (productTypes) {
    const typeList = productTypes.split(',').filter(Boolean)
    if (typeList.length === 1) {
      conditions.push(eq(products.productType, typeList[0]!))
    } else if (typeList.length > 1) {
      conditions.push(or(...typeList.map((t) => eq(products.productType, t))))
    }
  }

  if (productGroups) {
    const groupList = productGroups.split(',').filter(Boolean)
    if (groupList.length === 1) {
      conditions.push(eq(products.productGroup, groupList[0]!))
    } else if (groupList.length > 1) {
      conditions.push(or(...groupList.map((g) => eq(products.productGroup, g))))
    }
  }

  if (statuses) {
    const statusList = statuses.split(',').filter(Boolean)
    if (statusList.length === 1) {
      conditions.push(eq(products.status, statusList[0]!))
    } else if (statusList.length > 1) {
      conditions.push(or(...statusList.map((s) => eq(products.status, s))))
    }
  }

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(products.productCode, searchPattern),
        ilike(products.description, searchPattern),
        ilike(products.gtin, searchPattern),
      ),
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get items
  const items = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(products.productCode)
    .limit(pageSize)
    .offset(offset)

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(products)
    .where(whereClause)

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

export async function getProductFilterOptions() {
  // Get distinct product types with counts
  const productTypes = await db
    .select({
      value: products.productType,
      count: count(),
    })
    .from(products)
    .groupBy(products.productType)
    .orderBy(products.productType)

  // Get distinct product groups with counts
  const productGroups = await db
    .select({
      value: products.productGroup,
      count: count(),
    })
    .from(products)
    .groupBy(products.productGroup)
    .orderBy(products.productGroup)

  // Get distinct statuses with counts
  const statuses = await db
    .select({
      value: products.status,
      count: count(),
    })
    .from(products)
    .groupBy(products.status)
    .orderBy(products.status)

  return {
    productTypes: productTypes.filter((t) => t.value),
    productGroups: productGroups.filter((g) => g.value),
    statuses: statuses.filter((s) => s.value),
  }
}
