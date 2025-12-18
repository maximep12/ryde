import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../schema'
import { seedBookReviews, seedBooks } from './books'
import { seedUsers } from './users'

config({ path: '../../.env' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const db = drizzle(DATABASE_URL, { schema })

async function main() {
  console.log('Starting database seed...')

  await seedUsers(db)
  await seedBooks(db)
  await seedBookReviews(db)

  console.log('Database seed completed!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
