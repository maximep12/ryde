import {
  forecasts,
  inventory,
  oneLineSd,
  openPurchaseOrders,
  products,
  reportComments,
  users,
} from '@repo/db'
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql, sum, type SQL } from 'drizzle-orm'
import { db } from '../../db'
import type { ReportsQuery } from './schemas'

// Map column names to sortable columns
const sortableColumns = {
  plantName: 'plantName',
  materialNumber: 'materialNumber',
  materialDescription: 'materialDescription',
  currentStock: 'currentStock',
  safetyStock: 'safetyStock',
  risk: 'risk',
  firstProblemDate: 'firstProblemDate',
} as const

// Risk level for stock health (renamed from status to avoid confusion with product status)
type RiskLevel = 'high' | 'medium' | 'low'

// Product status from SAP (03=Active, 04=Phase Out, 05=Obsolete)
type ProductStatus = '03' | '04' | '05' | null

interface MonthlyProjection {
  year: number
  month: number
  isActual: boolean
  demand: number
  supply: number
  monthEndStock: number
  risk: RiskLevel
}

interface ReportItem {
  plantName: string
  materialNumber: string
  materialDescription: string | null
  productStatus: ProductStatus
  currentStock: number
  safetyStock: number
  risk: RiskLevel
  firstProblemDate: string | null
}

// Extract city from plant name (e.g., "IAW - WINDSOR PLANT" -> "Windsor")
function extractCityFromPlantName(plantName: string): string {
  // Try to extract the city between " - " and " PLANT" (case insensitive)
  const match = plantName.match(/\s-\s(.+?)(?:\sPLANT)?$/i)
  if (match) {
    // Return properly cased (capitalize first letter of each word)
    return match[1]!
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return plantName
}

// Get the date range for projections (current month through December of next year)
function getProjectionDateRange(): {
  startYear: number
  startMonth: number
  endYear: number
  endMonth: number
} {
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() + 1 // 1-indexed
  const endYear = now.getFullYear() + 1
  const endMonth = 12

  return { startYear, startMonth, endYear, endMonth }
}

// Calculate monthly projections for a specific plant+material combination
async function calculateProjections(
  plantName: string,
  materialNumber: string,
  currentStock: number,
  safetyStock: number,
): Promise<{ projections: MonthlyProjection[]; risk: RiskLevel; firstProblemDate: string | null }> {
  const { startYear, startMonth, endYear, endMonth } = getProjectionDateRange()
  const today = new Date()
  const plantCity = extractCityFromPlantName(plantName)

  // Fetch demand (from forecasts table)
  const demandData = await db
    .select({
      year: forecasts.year,
      month: forecasts.month,
      totalQuantity: sum(forecasts.quantity),
    })
    .from(forecasts)
    .where(
      and(
        eq(forecasts.productCode, materialNumber),
        ilike(forecasts.plant, `%${plantCity}%`),
        or(
          and(eq(forecasts.year, startYear), gte(forecasts.month, startMonth)),
          and(eq(forecasts.year, endYear), lte(forecasts.month, endMonth)),
        ),
      ),
    )
    .groupBy(forecasts.year, forecasts.month)

  // Create a map of demand by year-month
  const demandMap = new Map<string, number>()
  for (const row of demandData) {
    if (row.year && row.month) {
      const key = `${row.year}-${String(row.month).padStart(2, '0')}`
      demandMap.set(key, Number(row.totalQuantity) || 0)
    }
  }

  // Fetch supply (from open purchase orders)
  const supplyData = await db
    .select({
      scheduleDate: openPurchaseOrders.nextScheduleLineDate,
      totalQuantity: sum(openPurchaseOrders.quantityToBeDelivered),
    })
    .from(openPurchaseOrders)
    .where(
      and(
        eq(openPurchaseOrders.materialNumber, materialNumber),
        eq(openPurchaseOrders.plantName, plantName),
        gte(openPurchaseOrders.nextScheduleLineDate, sql`CURRENT_DATE`),
      ),
    )
    .groupBy(openPurchaseOrders.nextScheduleLineDate)

  // Create a map of supply by year-month
  const supplyMap = new Map<string, number>()
  for (const row of supplyData) {
    if (row.scheduleDate) {
      const date = new Date(row.scheduleDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = supplyMap.get(key) || 0
      supplyMap.set(key, existing + (Number(row.totalQuantity) || 0))
    }
  }

  // Calculate monthly projections
  const projections: MonthlyProjection[] = []
  let runningStock = currentStock
  let overallRisk: RiskLevel = 'low'
  let firstProblemDate: string | null = null

  let currentYear = startYear
  let currentMonth = startMonth

  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const key = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    const demand = demandMap.get(key) || 0
    const supply = supplyMap.get(key) || 0

    runningStock = runningStock + supply - demand

    // Determine if this month is actual (past) or forecast (future)
    const monthDate = new Date(currentYear, currentMonth - 1, 1)
    const isActual = monthDate < new Date(today.getFullYear(), today.getMonth(), 1)

    // Determine risk level
    let monthRisk: RiskLevel = 'low'
    if (runningStock < 0) {
      monthRisk = 'high'
      if (overallRisk !== 'high') {
        overallRisk = 'high'
      }
      if (!firstProblemDate) {
        firstProblemDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      }
    } else if (runningStock < safetyStock) {
      monthRisk = 'medium'
      if (overallRisk === 'low') {
        overallRisk = 'medium'
      }
      if (!firstProblemDate) {
        firstProblemDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      }
    }

    projections.push({
      year: currentYear,
      month: currentMonth,
      isActual,
      demand,
      supply,
      monthEndStock: runningStock,
      risk: monthRisk,
    })

    // Move to next month
    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
  }

  return { projections, risk: overallRisk, firstProblemDate }
}

// Allowed plant acronyms for reports
const ALLOWED_PLANT_ACRONYMS = ['IAW', 'ICS', 'ICB', 'ICE']

// Helper to check if plant name starts with allowed acronym
function isAllowedPlant(plantName: string): boolean {
  const acronym = plantName.split(' - ')[0]
  return ALLOWED_PLANT_ACRONYMS.includes(acronym ?? '')
}

export async function getReports(query: ReportsQuery) {
  const {
    page,
    pageSize,
    search,
    plantNames,
    riskLevels,
    productStatuses,
    nextProblemPeriod,
    status,
    sortBy,
    sortOrder,
  } = query
  const offset = (page - 1) * pageSize

  // First, get all plant+material combinations with aggregated stock from inventory
  const inventoryConditions: SQL[] = []

  // Always filter by allowed plant acronyms using LIKE patterns
  const allowedPlantPatterns = ALLOWED_PLANT_ACRONYMS.map((acronym) =>
    ilike(inventory.plantName, `${acronym} - %`),
  )
  inventoryConditions.push(or(...allowedPlantPatterns)!)

  if (plantNames) {
    const plantList = plantNames.split(',').filter(Boolean)
    if (plantList.length === 1) {
      inventoryConditions.push(eq(inventory.plantName, plantList[0]!))
    } else if (plantList.length > 1) {
      inventoryConditions.push(or(...plantList.map((p) => eq(inventory.plantName, p)))!)
    }
  }

  if (search) {
    const searchPattern = `%${search}%`
    inventoryConditions.push(
      or(
        ilike(inventory.material, searchPattern),
        ilike(inventory.materialDescription, searchPattern),
        ilike(inventory.plantName, searchPattern),
      )!,
    )
  }

  const inventoryWhereClause =
    inventoryConditions.length > 0 ? and(...inventoryConditions) : undefined

  // Get aggregated inventory data (sum stock by plant+material)
  const inventoryData = await db
    .select({
      plantName: inventory.plantName,
      materialNumber: inventory.material,
      materialDescription: inventory.materialDescription,
      totalStock: sum(inventory.unrestrictedStock),
    })
    .from(inventory)
    .where(inventoryWhereClause)
    .groupBy(inventory.plantName, inventory.material, inventory.materialDescription)

  // Calculate projections for each item and determine risk
  const itemsWithRisk: ReportItem[] = []

  for (const inv of inventoryData) {
    if (!inv.plantName || !inv.materialNumber) continue

    // Get safety stock from oneLineSd (default to 0 if not found)
    const [sdData] = await db
      .select({ safetyStock: oneLineSd.safetyStock })
      .from(oneLineSd)
      .where(
        and(
          eq(oneLineSd.plantName, inv.plantName),
          eq(oneLineSd.materialNumber, inv.materialNumber),
        ),
      )
      .limit(1)

    // Get product status from products table
    const [productData] = await db
      .select({ status: products.status })
      .from(products)
      .where(eq(products.productCode, inv.materialNumber))
      .limit(1)

    const safetyStock = sdData?.safetyStock ?? 0
    const currentStock = Number(inv.totalStock) || 0
    const productStatus = (productData?.status as ProductStatus) ?? null

    // Calculate projections
    const { risk: itemRisk, firstProblemDate } = await calculateProjections(
      inv.plantName,
      inv.materialNumber,
      currentStock,
      safetyStock,
    )

    itemsWithRisk.push({
      plantName: inv.plantName,
      materialNumber: inv.materialNumber,
      materialDescription: inv.materialDescription,
      productStatus,
      currentStock,
      safetyStock,
      risk: itemRisk,
      firstProblemDate,
    })
  }

  // Filter by risk level
  let filteredItems = itemsWithRisk

  // First apply specific risk level filters if provided
  if (riskLevels) {
    const riskList = riskLevels.split(',').filter(Boolean) as RiskLevel[]
    if (riskList.length > 0) {
      filteredItems = filteredItems.filter((item) => riskList.includes(item.risk))
    }
  }

  // Then apply quick filter (status) if no specific risk levels selected
  if (!riskLevels) {
    if (status === 'problems') {
      filteredItems = filteredItems.filter((item) => item.risk === 'high' || item.risk === 'medium')
    } else if (status === 'ok') {
      filteredItems = filteredItems.filter((item) => item.risk === 'low')
    }
  }

  // Filter by product status
  if (productStatuses) {
    const statusList = productStatuses.split(',').filter(Boolean) as ProductStatus[]
    if (statusList.length > 0) {
      filteredItems = filteredItems.filter((item) => statusList.includes(item.productStatus))
    }
  }

  // Filter by next problem period (YYYY-MM format)
  if (nextProblemPeriod) {
    const [year, month] = nextProblemPeriod.split('-').map(Number)
    if (year && month) {
      filteredItems = filteredItems.filter((item) => {
        if (!item.firstProblemDate) return false
        const problemDate = new Date(item.firstProblemDate)
        return problemDate.getFullYear() === year && problemDate.getMonth() + 1 === month
      })
    }
  }

  // Sort items
  const sortKey = sortBy && sortBy in sortableColumns ? sortBy : 'plantName'
  const sortDirection = sortOrder === 'desc' ? -1 : 1

  filteredItems.sort((a, b) => {
    const aVal = a[sortKey as keyof ReportItem]
    const bVal = b[sortKey as keyof ReportItem]

    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * sortDirection
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * sortDirection
    }

    return 0
  })

  // Apply pagination
  const total = filteredItems.length
  const paginatedItems = filteredItems.slice(offset, offset + pageSize)

  return {
    items: paginatedItems,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getReportDetail(plantName: string, materialNumber: string) {
  // Get inventory data
  const [inventoryData] = await db
    .select({
      plantName: inventory.plantName,
      materialNumber: inventory.material,
      materialDescription: inventory.materialDescription,
      totalStock: sum(inventory.unrestrictedStock),
    })
    .from(inventory)
    .where(and(eq(inventory.plantName, plantName), eq(inventory.material, materialNumber)))
    .groupBy(inventory.plantName, inventory.material, inventory.materialDescription)

  if (!inventoryData) {
    return null
  }

  // Get safety stock, purchaser info, and lead time from oneLineSd
  const [sdData] = await db
    .select({
      safetyStock: oneLineSd.safetyStock,
      purchasingGroupName: oneLineSd.purchasingGroupName,
      plannedDeliveryTime: oneLineSd.plannedDeliveryTime,
    })
    .from(oneLineSd)
    .where(and(eq(oneLineSd.plantName, plantName), eq(oneLineSd.materialNumber, materialNumber)))
    .limit(1)

  // Get product status from products table
  const [productData] = await db
    .select({ status: products.status })
    .from(products)
    .where(eq(products.productCode, materialNumber))
    .limit(1)

  // Get distinct storage locations for this plant+material
  const storageLocationsData = await db
    .select({
      storageLocation: inventory.storageLocation,
      storageLocationDescription: inventory.storageLocationDescription,
    })
    .from(inventory)
    .where(and(eq(inventory.plantName, plantName), eq(inventory.material, materialNumber)))
    .groupBy(inventory.storageLocation, inventory.storageLocationDescription)

  const storageLocations = storageLocationsData
    .filter((sl) => sl.storageLocation)
    .map((sl) => ({
      code: sl.storageLocation!,
      description: sl.storageLocationDescription,
    }))

  // Get count of open purchase orders
  const [openPoCountData] = await db
    .select({ count: count() })
    .from(openPurchaseOrders)
    .where(
      and(
        eq(openPurchaseOrders.materialNumber, materialNumber),
        eq(openPurchaseOrders.plantName, plantName),
      ),
    )

  const openPoCount = openPoCountData?.count ?? 0

  const safetyStock = sdData?.safetyStock ?? 0
  const currentStock = Number(inventoryData.totalStock) || 0
  const productStatus = (productData?.status as ProductStatus) ?? null

  // Calculate full projections
  const { projections, risk, firstProblemDate } = await calculateProjections(
    plantName,
    materialNumber,
    currentStock,
    safetyStock,
  )

  return {
    plantName,
    materialNumber,
    materialDescription: inventoryData.materialDescription,
    productStatus,
    currentStock,
    safetyStock,
    risk,
    firstProblemDate,
    projections,
    purchaserName: sdData?.purchasingGroupName ?? null,
    leadTime: sdData?.plannedDeliveryTime ?? null,
    storageLocations,
    openPoCount,
  }
}

export async function getReportFilterOptions() {
  // Get distinct plant names from inventory with counts
  const plantNames = await db
    .select({
      value: inventory.plantName,
      count: count(),
    })
    .from(inventory)
    .groupBy(inventory.plantName)
    .orderBy(inventory.plantName)

  // Filter to only allowed plants (by acronym prefix)
  const filteredPlantNames = plantNames.filter((p) => {
    if (!p.value) return false
    const acronym = p.value.split(' - ')[0]
    return ALLOWED_PLANT_ACRONYMS.includes(acronym ?? '')
  })

  return {
    plantNames: filteredPlantNames,
  }
}

// ============================================================================
// REPORT COMMENTS HELPERS
// ============================================================================

export async function getReportComments(plantName: string, materialNumber: string) {
  return db
    .select({
      id: reportComments.id,
      plantName: reportComments.plantName,
      materialNumber: reportComments.materialNumber,
      userId: reportComments.userId,
      content: reportComments.content,
      createdAt: reportComments.createdAt,
      updatedAt: reportComments.updatedAt,
      author: {
        id: users.id,
        givenName: users.givenName,
        familyName: users.familyName,
        email: users.email,
      },
    })
    .from(reportComments)
    .innerJoin(users, eq(reportComments.userId, users.id))
    .where(
      and(
        eq(reportComments.plantName, plantName),
        eq(reportComments.materialNumber, materialNumber),
      ),
    )
    .orderBy(desc(reportComments.createdAt))
}

export async function createReportComment(
  plantName: string,
  materialNumber: string,
  userId: string,
  content: string,
) {
  const [comment] = await db
    .insert(reportComments)
    .values({ plantName, materialNumber, userId, content })
    .returning()
  return comment
}

export async function updateReportComment(commentId: number, userId: string, content: string) {
  const [comment] = await db
    .update(reportComments)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(reportComments.id, commentId), eq(reportComments.userId, userId)))
    .returning()
  return comment ?? null
}

export async function deleteReportComment(commentId: number, userId: string) {
  const [comment] = await db
    .delete(reportComments)
    .where(and(eq(reportComments.id, commentId), eq(reportComments.userId, userId)))
    .returning()
  return comment ?? null
}
