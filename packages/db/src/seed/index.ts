import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../schema'
import {
  bookReviews,
  books,
  clientAssortments,
  clientComments,
  clientExchanges,
  clientOrderIssues,
  clientOrderItems,
  clientOrders,
  clients,
  forecasts,
  inventory,
  oneLineSd,
  openPurchaseOrders,
  plants,
  products,
  reportComments,
  reportValidations,
  users,
} from '../schema'
import { seedBookReviews, seedBooks } from './books'
import {
  seedClientAssortments,
  seedClientComments,
  seedClientExchanges,
  seedClientOrderIssues,
  seedClientOrders,
  seedClients,
} from './clients'
import { seedForecasts } from './forecasts'
import { seedInventory } from './inventory'
import { seedOneLineSd } from './oneLineSd'
import { seedOpenPurchaseOrders } from './openPurchaseOrders'
import { seedPlants } from './plants'
import { seedProducts } from './products'
import { seedReportComments } from './reportComments'
import { seedReportValidations } from './reportValidations'
import { seedUsers } from './users'

config({ path: '../../.env' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const db = drizzle(DATABASE_URL, { schema })

/**
 * Clears all data from all tables in the correct order (child tables first).
 * This ensures no foreign key constraint violations during deletion.
 */
async function clearAllData() {
  console.log('Clearing all existing data...')

  // Delete in order: child tables first, then parent tables
  await db.delete(bookReviews)
  await db.delete(clientComments)
  await db.delete(reportComments)
  await db.delete(reportValidations)
  await db.delete(clientOrderIssues)
  await db.delete(clientOrderItems)
  await db.delete(clientExchanges)
  await db.delete(clientAssortments)
  await db.delete(clientOrders)
  await db.delete(clients)
  await db.delete(books)
  await db.delete(forecasts)
  await db.delete(inventory)
  await db.delete(oneLineSd)
  await db.delete(openPurchaseOrders)
  await db.delete(plants)
  await db.delete(products)
  await db.delete(users)

  console.log('All data cleared.')
}

async function main() {
  console.log('Starting database seed...')

  // Clear all data first to ensure clean state
  await clearAllData()

  await seedUsers(db)
  await seedBooks(db)
  await seedBookReviews(db)
  await seedPlants(db)
  await seedProducts(db)
  await seedForecasts(db)
  await seedInventory(db)
  await seedOneLineSd(db)
  await seedOpenPurchaseOrders(db)
  await seedClients(db)
  await seedClientOrders(db)
  await seedClientOrderIssues(db)
  await seedClientExchanges(db)
  await seedClientAssortments(db)
  await seedClientComments(db)
  await seedReportComments(db)
  await seedReportValidations(db)

  console.log('Database seed completed!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
