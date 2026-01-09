import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../schema'
import { inventory, reportValidations, users } from '../schema'

// Reference date for deterministic seeding (same as clients.ts)
const REFERENCE_DATE = new Date('2025-01-15T12:00:00Z')

// Deterministic random number generator (same as clients.ts)
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export async function seedReportValidations(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding report validations...')

  // Get distinct plant+material combinations from inventory (limited set for seeding)
  const inventoryItems = await db
    .select({
      plantName: inventory.plantName,
      materialNumber: inventory.material,
    })
    .from(inventory)
    .groupBy(inventory.plantName, inventory.material)
    .limit(30)

  if (inventoryItems.length === 0) {
    console.log('Skipping report validations seed: no inventory items found')
    return
  }

  // Get all available users
  const seedUsersList = await db.select({ id: users.id, email: users.email }).from(users).limit(10)

  if (seedUsersList.length === 0) {
    console.log('Skipping report validations seed: no users found')
    return
  }

  const validations: Array<{
    plantName: string
    materialNumber: string
    validatedBy: string
    validatedAt: Date
    createdAt: Date
  }> = []

  for (let itemIdx = 0; itemIdx < inventoryItems.length; itemIdx++) {
    const item = inventoryItems[itemIdx]!
    if (!item.plantName || !item.materialNumber) continue

    // Skip some reports to leave them unvalidated (every 4th report)
    if (itemIdx % 4 === 3) continue

    // Deterministic user selection
    const userIdx = itemIdx % seedUsersList.length
    const user = seedUsersList[userIdx]!

    // Deterministic validation age:
    // - ~30% recent (within last month)
    // - ~30% medium (1-3 months ago)
    // - ~40% stale (3-6 months ago)
    const seed = itemIdx * 100 + 8000
    const randomValue = seededRandom(seed)

    let daysAgo: number
    if (randomValue < 0.3) {
      // Recent: 1-30 days ago
      daysAgo = Math.floor(seededRandom(seed + 1) * 30) + 1
    } else if (randomValue < 0.6) {
      // Medium: 31-90 days ago
      daysAgo = Math.floor(seededRandom(seed + 2) * 60) + 31
    } else {
      // Stale: 91-180 days ago
      daysAgo = Math.floor(seededRandom(seed + 3) * 90) + 91
    }

    const validatedAt = new Date(REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    validations.push({
      plantName: item.plantName,
      materialNumber: item.materialNumber,
      validatedBy: user.id,
      validatedAt,
      createdAt: validatedAt,
    })
  }

  if (validations.length > 0) {
    await db.insert(reportValidations).values(validations)
  }
  console.log(`Created ${validations.length} report validations`)
}
