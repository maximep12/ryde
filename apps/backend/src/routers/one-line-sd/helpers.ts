import { oneLineSd } from '@repo/db'
import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm'
import { db } from '../../db'
import type { OneLineSdQuery } from './schemas'

// Map column names to oneLineSd table columns
const sortableColumns = {
  plantName: oneLineSd.plantName,
  materialNumber: oneLineSd.materialNumber,
  materialDescription: oneLineSd.materialDescription,
  purchasingGroup: oneLineSd.purchasingGroup,
  purchasingGroupName: oneLineSd.purchasingGroupName,
  safetyStock: oneLineSd.safetyStock,
  materialGroup: oneLineSd.materialGroup,
  plannedDeliveryTime: oneLineSd.plannedDeliveryTime,
} as const

export async function getOneLineSd(query: OneLineSdQuery) {
  const {
    page,
    pageSize,
    search,
    plantNames,
    materialGroups,
    purchasingGroups,
    sortBy,
    sortOrder,
  } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (plantNames) {
    const plantList = plantNames.split(',').filter(Boolean)
    if (plantList.length === 1) {
      conditions.push(eq(oneLineSd.plantName, plantList[0]!))
    } else if (plantList.length > 1) {
      conditions.push(or(...plantList.map((p) => eq(oneLineSd.plantName, p))))
    }
  }

  if (materialGroups) {
    const groupList = materialGroups.split(',').filter(Boolean)
    if (groupList.length === 1) {
      conditions.push(eq(oneLineSd.materialGroup, groupList[0]!))
    } else if (groupList.length > 1) {
      conditions.push(or(...groupList.map((g) => eq(oneLineSd.materialGroup, g))))
    }
  }

  if (purchasingGroups) {
    const purchList = purchasingGroups.split(',').filter(Boolean)
    if (purchList.length === 1) {
      conditions.push(eq(oneLineSd.purchasingGroup, purchList[0]!))
    } else if (purchList.length > 1) {
      conditions.push(or(...purchList.map((p) => eq(oneLineSd.purchasingGroup, p))))
    }
  }

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(oneLineSd.materialNumber, searchPattern),
        ilike(oneLineSd.materialDescription, searchPattern),
        ilike(oneLineSd.plantName, searchPattern),
        ilike(oneLineSd.purchasingGroupName, searchPattern),
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
    orderByClause = asc(oneLineSd.materialNumber)
  }

  // Get items
  const items = await db
    .select()
    .from(oneLineSd)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(pageSize)
    .offset(offset)

  // Get total count
  const [countResult] = await db.select({ count: count() }).from(oneLineSd).where(whereClause)

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

export async function getOneLineSdFilterOptions() {
  // Get distinct plant names with counts
  const plantNames = await db
    .select({
      value: oneLineSd.plantName,
      count: count(),
    })
    .from(oneLineSd)
    .groupBy(oneLineSd.plantName)
    .orderBy(oneLineSd.plantName)

  // Get distinct material groups with counts
  const materialGroups = await db
    .select({
      value: oneLineSd.materialGroup,
      count: count(),
    })
    .from(oneLineSd)
    .groupBy(oneLineSd.materialGroup)
    .orderBy(oneLineSd.materialGroup)

  // Get distinct purchasing groups with counts (include name)
  const purchasingGroups = await db
    .select({
      value: oneLineSd.purchasingGroup,
      label: oneLineSd.purchasingGroupName,
      count: count(),
    })
    .from(oneLineSd)
    .groupBy(oneLineSd.purchasingGroup, oneLineSd.purchasingGroupName)
    .orderBy(oneLineSd.purchasingGroup)

  return {
    plantNames: plantNames.filter((p) => p.value),
    materialGroups: materialGroups.filter((m) => m.value),
    purchasingGroups: purchasingGroups.filter((p) => p.value),
  }
}
