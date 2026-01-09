import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import { plants } from '../schema'

export const SEED_PLANTS = [
  {
    acronym: 'IAW',
    fullName: 'IAW - WINDSOR PLANT',
    city: 'Windsor',
    country: 'USA',
  },
  {
    acronym: 'ICS',
    fullName: 'ICS - ST-ALEXIS PLANT',
    city: 'Saint-Alexis',
    country: 'Canada',
  },
  {
    acronym: 'ICB',
    fullName: 'ICB - BOUCHERVILLE PLANT',
    city: 'Boucherville',
    country: 'Canada',
  },
  {
    acronym: 'ICE',
    fullName: 'ICE - ETOBICOKE PLANT',
    city: 'Etobicoke',
    country: 'Canada',
  },
]

export async function seedPlants(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding plants...')

  await db.insert(plants).values(SEED_PLANTS)
  console.log(`Created ${SEED_PLANTS.length} plant locations`)
}
