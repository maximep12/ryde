import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import { plants } from '../schema'

export const SEED_PLANTS = [
  {
    acronym: 'IAW',
    city: 'Windsor',
    country: 'USA',
  },
  {
    acronym: 'ICS',
    city: 'St-Alexis',
    country: 'Canada',
  },
  {
    acronym: 'ICB',
    city: 'Boucherville',
    country: 'Canada',
  },
  {
    acronym: 'ICE',
    city: 'Etobicoke',
    country: 'Canada',
  },
]

export async function seedPlants(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding plants...')

  await db.insert(plants).values(SEED_PLANTS)
  console.log(`Created ${SEED_PLANTS.length} plant locations`)
}
