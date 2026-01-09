import { openPurchaseOrders } from '@repo/db'
import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { db } from '../../db'
import type { OpenPurchaseOrdersQuery } from './schemas'

// Map column names to open purchase orders table columns
const sortableColumns = {
  purchaseOrder: openPurchaseOrders.purchaseOrder,
  material: openPurchaseOrders.material,
  materialNumber: openPurchaseOrders.materialNumber,
  plantName: openPurchaseOrders.plantName,
  supplier: openPurchaseOrders.supplier,
  orderQuantity: openPurchaseOrders.orderQuantity,
  quantityToBeDelivered: openPurchaseOrders.quantityToBeDelivered,
  nextScheduleLineDate: openPurchaseOrders.nextScheduleLineDate,
} as const

export async function getOpenPurchaseOrders(query: OpenPurchaseOrdersQuery) {
  const { page, pageSize, search, plants, orderTypes, suppliers, sortBy, sortOrder } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (plants) {
    const plantList = plants.split(',').filter(Boolean)
    if (plantList.length === 1) {
      conditions.push(eq(openPurchaseOrders.plantName, plantList[0]!))
    } else if (plantList.length > 1) {
      conditions.push(or(...plantList.map((p) => eq(openPurchaseOrders.plantName, p))))
    }
  }

  if (orderTypes) {
    const typeList = orderTypes.split(',').filter(Boolean)
    if (typeList.length === 1) {
      conditions.push(eq(openPurchaseOrders.orderType, typeList[0]!))
    } else if (typeList.length > 1) {
      conditions.push(or(...typeList.map((t) => eq(openPurchaseOrders.orderType, t))))
    }
  }

  if (suppliers) {
    const supplierList = suppliers.split(',').filter(Boolean)
    if (supplierList.length === 1) {
      conditions.push(eq(openPurchaseOrders.supplier, supplierList[0]!))
    } else if (supplierList.length > 1) {
      conditions.push(or(...supplierList.map((s) => eq(openPurchaseOrders.supplier, s))))
    }
  }

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(openPurchaseOrders.purchaseOrder, searchPattern),
        ilike(openPurchaseOrders.material, searchPattern),
        ilike(openPurchaseOrders.materialNumber, searchPattern),
        ilike(openPurchaseOrders.supplier, searchPattern),
      ),
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Build order by clause
  let orderByClause: SQL | undefined
  if (sortBy && sortBy in sortableColumns) {
    const column = sortableColumns[sortBy as keyof typeof sortableColumns]
    orderByClause = sortOrder === 'desc' ? desc(column) : asc(column)
  } else {
    orderByClause = asc(openPurchaseOrders.nextScheduleLineDate)
  }

  // Get items
  const items = await db
    .select()
    .from(openPurchaseOrders)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset)

  // Get total count
  const [countResult] = await db
    .select({ count: count() })
    .from(openPurchaseOrders)
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

export async function getOpenPurchaseOrdersFilterOptions() {
  // Get distinct plants with counts
  const plants = await db
    .select({
      value: openPurchaseOrders.plantName,
      count: count(),
    })
    .from(openPurchaseOrders)
    .groupBy(openPurchaseOrders.plantName)
    .orderBy(openPurchaseOrders.plantName)

  // Get distinct order types with counts
  const orderTypes = await db
    .select({
      value: openPurchaseOrders.orderType,
      count: count(),
    })
    .from(openPurchaseOrders)
    .groupBy(openPurchaseOrders.orderType)
    .orderBy(openPurchaseOrders.orderType)

  // Get distinct suppliers with counts
  const suppliers = await db
    .select({
      value: openPurchaseOrders.supplier,
      count: count(),
    })
    .from(openPurchaseOrders)
    .groupBy(openPurchaseOrders.supplier)
    .orderBy(openPurchaseOrders.supplier)

  return {
    plants: plants.filter((p) => p.value),
    orderTypes: orderTypes.filter((t) => t.value),
    suppliers: suppliers.filter((s) => s.value),
  }
}
