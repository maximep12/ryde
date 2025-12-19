import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import { products } from '../schema'

export const SEED_PRODUCTS = [
  // OdourLock Premium Line
  {
    sku: 'ODL-UNS-6',
    name: 'OdourLock Unscented 6kg',
    category: 'OdourLock',
    packageType: 'jug',
    price: 2499,
  },
  {
    sku: 'ODL-UNS-12',
    name: 'OdourLock Unscented 12kg',
    category: 'OdourLock',
    packageType: 'jug',
    price: 3999,
  },
  {
    sku: 'ODL-MTC-12',
    name: 'OdourLock Multi-Cat 12kg',
    category: 'OdourLock',
    packageType: 'jug',
    price: 4299,
  },
  {
    sku: 'ODL-LAV-12',
    name: 'OdourLock Lavender Field 12kg',
    category: 'OdourLock',
    packageType: 'jug',
    price: 4299,
  },
  // Odour Buster Line
  {
    sku: 'ODB-ORI-6',
    name: 'Odour Buster Original 6kg',
    category: 'Odour Buster',
    packageType: 'box',
    price: 1899,
  },
  {
    sku: 'ODB-ORI-14',
    name: 'Odour Buster Original 14kg',
    category: 'Odour Buster',
    packageType: 'box',
    price: 2999,
  },
  {
    sku: 'ODB-MTC-12',
    name: 'Odour Buster Multi-Cat 12kg',
    category: 'Odour Buster',
    packageType: 'box',
    price: 2799,
  },
  // Classic Line
  {
    sku: 'CLS-UNS-14',
    name: 'Classic Unscented 14kg',
    category: 'Classic',
    packageType: 'plastic_bag',
    price: 1499,
  },
  {
    sku: 'CLS-UNS-18',
    name: 'Classic Unscented 18kg',
    category: 'Classic',
    packageType: 'plastic_bag',
    price: 1899,
  },
  {
    sku: 'CLS-BBP-14',
    name: 'Classic Baby Powder 14kg',
    category: 'Classic',
    packageType: 'plastic_bag',
    price: 1599,
  },
  {
    sku: 'CLS-LAV-14',
    name: 'Classic Lavender 14kg',
    category: 'Classic',
    packageType: 'plastic_bag',
    price: 1599,
  },
  {
    sku: 'CLS-PIN-14',
    name: 'Classic Pine Forest 14kg',
    category: 'Classic',
    packageType: 'plastic_bag',
    price: 1599,
  },
]

export async function seedProducts(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding products...')

  await db.insert(products).values(SEED_PRODUCTS)
  console.log(`Created ${SEED_PRODUCTS.length} sample products`)
}
