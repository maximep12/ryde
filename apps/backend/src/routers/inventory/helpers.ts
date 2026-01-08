import { inventory } from '@repo/db'
import { and, count, eq, ilike, or } from 'drizzle-orm'
import { db } from '../../db'
import type { InventoryQuery } from './schemas'

export async function getInventory(query: InventoryQuery) {
  const { page, pageSize, search, plants, storageLocations, baseUnits } = query
  const offset = (page - 1) * pageSize

  const conditions = []

  if (plants) {
    const plantList = plants.split(',').filter(Boolean)
    if (plantList.length === 1) {
      conditions.push(eq(inventory.plant, plantList[0]!))
    } else if (plantList.length > 1) {
      conditions.push(or(...plantList.map((p) => eq(inventory.plant, p))))
    }
  }

  if (storageLocations) {
    const locationList = storageLocations.split(',').filter(Boolean)
    if (locationList.length === 1) {
      conditions.push(eq(inventory.storageLocation, locationList[0]!))
    } else if (locationList.length > 1) {
      conditions.push(or(...locationList.map((l) => eq(inventory.storageLocation, l))))
    }
  }

  if (baseUnits) {
    const unitList = baseUnits.split(',').filter(Boolean)
    if (unitList.length === 1) {
      conditions.push(eq(inventory.baseUnit, unitList[0]!))
    } else if (unitList.length > 1) {
      conditions.push(or(...unitList.map((u) => eq(inventory.baseUnit, u))))
    }
  }

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(inventory.material, searchPattern),
        ilike(inventory.materialDescription, searchPattern),
        ilike(inventory.plantName, searchPattern),
        ilike(inventory.storageLocationDescription, searchPattern),
      ),
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get items
  const items = await db
    .select()
    .from(inventory)
    .where(whereClause)
    .orderBy(inventory.material)
    .limit(pageSize)
    .offset(offset)

  // Get total count
  const [countResult] = await db.select({ count: count() }).from(inventory).where(whereClause)

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

export async function getInventoryFilterOptions() {
  // Get distinct plants with counts
  const plants = await db
    .select({
      value: inventory.plant,
      label: inventory.plantName,
      count: count(),
    })
    .from(inventory)
    .groupBy(inventory.plant, inventory.plantName)
    .orderBy(inventory.plant)

  // Get distinct storage locations with counts
  const storageLocations = await db
    .select({
      value: inventory.storageLocation,
      label: inventory.storageLocationDescription,
      count: count(),
    })
    .from(inventory)
    .groupBy(inventory.storageLocation, inventory.storageLocationDescription)
    .orderBy(inventory.storageLocation)

  // Get distinct base units with counts
  const baseUnits = await db
    .select({
      value: inventory.baseUnit,
      count: count(),
    })
    .from(inventory)
    .groupBy(inventory.baseUnit)
    .orderBy(inventory.baseUnit)

  return {
    plants: plants.filter((p) => p.value),
    storageLocations: storageLocations.filter((l) => l.value),
    baseUnits: baseUnits.filter((u) => u.value),
  }
}
