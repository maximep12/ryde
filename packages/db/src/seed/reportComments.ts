import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../schema'
import { inventory, reportComments, users } from '../schema'

// Reference date for deterministic seeding (same as clients.ts)
const REFERENCE_DATE = new Date('2025-01-15T12:00:00Z')

// Deterministic random number generator (same as clients.ts)
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// We'll query all available users instead of specific emails

const REPORT_COMMENT_TEMPLATES = [
  'Reviewed stock levels with purchasing team. Expecting supplier shipment next week.',
  'Lead time extended due to raw material shortage. Flagged for escalation.',
  'Safety stock adjusted based on seasonal demand forecasting.',
  'Spoke with supplier about expediting delivery. Confirmed earlier ship date.',
  'Production planning aware of low stock situation. Monitoring closely.',
  'Quality hold released. Stock now available for allocation.',
  'Vendor confirmed backorder will ship by end of month.',
  'Discussed alternative supplier options with procurement.',
  'Stock transferred from alternate location to cover demand.',
  'Customer allocated additional units pending PO arrival.',
  'Demand forecast updated based on sales team input.',
  'Inventory count completed. Variance corrected in system.',
  'Emergency order placed to prevent stockout.',
  'Coordinating with logistics for priority delivery.',
  'Supplier reliability review scheduled for next quarter.',
]

export async function seedReportComments(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding report comments...')

  // Get distinct plant+material combinations from inventory (limited set for seeding)
  const inventoryItems = await db
    .select({
      plantName: inventory.plantName,
      materialNumber: inventory.material,
    })
    .from(inventory)
    .groupBy(inventory.plantName, inventory.material)
    .limit(20)

  if (inventoryItems.length === 0) {
    console.log('Skipping report comments seed: no inventory items found')
    return
  }

  // Get all available users
  const seedUsersList = await db.select({ id: users.id, email: users.email }).from(users).limit(10)

  if (seedUsersList.length === 0) {
    console.log('Skipping report comments seed: no users found')
    return
  }

  const comments: Array<{
    plantName: string
    materialNumber: string
    userId: string
    content: string
    createdAt: Date
  }> = []

  for (let itemIdx = 0; itemIdx < inventoryItems.length; itemIdx++) {
    const item = inventoryItems[itemIdx]!
    if (!item.plantName || !item.materialNumber) continue

    // Each report gets 1-3 comments (deterministic based on index)
    const numComments = 1 + (itemIdx % 3)

    for (let commentIdx = 0; commentIdx < numComments; commentIdx++) {
      // Deterministic user selection
      const userIdx = (itemIdx + commentIdx) % seedUsersList.length
      const user = seedUsersList[userIdx]!

      // Deterministic comment content
      const templateIdx = (itemIdx * 3 + commentIdx) % REPORT_COMMENT_TEMPLATES.length
      const content = REPORT_COMMENT_TEMPLATES[templateIdx]!

      // Deterministic date (comments spread over last 60 days)
      const seed = itemIdx * 100 + commentIdx + 7000
      const daysAgo = Math.floor(seededRandom(seed) * 60) + 1
      const createdAt = new Date(REFERENCE_DATE.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      comments.push({
        plantName: item.plantName,
        materialNumber: item.materialNumber,
        userId: user.id,
        content,
        createdAt,
      })
    }
  }

  if (comments.length > 0) {
    await db.insert(reportComments).values(comments)
  }
  console.log(`Created ${comments.length} report comments`)
}
