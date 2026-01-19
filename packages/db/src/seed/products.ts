import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../schema'
import { products } from '../schema'

type SeedProduct = {
  productCode: string
  description: string
  productType: string | null
  productGroup: string | null
  gtin: string | null
  productCategory: string | null
  status: string | null
}

export const SEED_PRODUCTS: SeedProduct[] = [
  // Chocolate products
  {
    productCode: 'CHO-001',
    description: 'Dark Chocolate Truffles - 12 Pack',
    productType: 'chocolate',
    productGroup: 'premium',
    gtin: '012345678901',
    productCategory: 'Confectionery',
    status: '05',
  },
  {
    productCode: 'CHO-002',
    description: 'Milk Chocolate Bar - 100g',
    productType: 'chocolate',
    productGroup: 'classic',
    gtin: '012345678902',
    productCategory: 'Confectionery',
    status: '05',
  },
  // Gummy products
  {
    productCode: 'GUM-001',
    description: 'Gummy Bears - 500g Bag',
    productType: 'gummy',
    productGroup: 'classic',
    gtin: '012345678910',
    productCategory: 'Confectionery',
    status: '05',
  },
  {
    productCode: 'GUM-002',
    description: 'Sour Gummy Worms - 300g Bag',
    productType: 'gummy',
    productGroup: 'classic',
    gtin: '012345678911',
    productCategory: 'Confectionery',
    status: '05',
  },
  // Hard candy
  {
    productCode: 'HRD-001',
    description: 'Butterscotch Drops - 200g Tin',
    productType: 'hard_candy',
    productGroup: 'classic',
    gtin: '012345678920',
    productCategory: 'Confectionery',
    status: '05',
  },
  {
    productCode: 'HRD-002',
    description: 'Fruit Drops Assorted - 300g Bag',
    productType: 'hard_candy',
    productGroup: 'classic',
    gtin: '012345678921',
    productCategory: 'Confectionery',
    status: '05',
  },
  // Lollipops
  {
    productCode: 'LOL-001',
    description: 'Rainbow Swirl Lollipops - Box of 24',
    productType: 'lollipop',
    productGroup: 'classic',
    gtin: '012345678930',
    productCategory: 'Confectionery',
    status: '05',
  },
  // Licorice
  {
    productCode: 'LIC-001',
    description: 'Red Licorice Twists - 400g Bag',
    productType: 'licorice',
    productGroup: 'classic',
    gtin: '012345678940',
    productCategory: 'Confectionery',
    status: '05',
  },
  // Sugar-free option
  {
    productCode: 'SFR-001',
    description: 'Sugar-Free Gummy Bears - 250g',
    productType: 'gummy',
    productGroup: 'sugar_free',
    gtin: '012345678912',
    productCategory: 'Confectionery',
    status: '05',
  },
  // Seasonal
  {
    productCode: 'SEA-001',
    description: 'Valentine Heart Chocolates - Gift Box',
    productType: 'chocolate',
    productGroup: 'seasonal',
    gtin: '012345678951',
    productCategory: 'Confectionery',
    status: '05',
  },
  // Niche/specialty products (low performers - rarely ordered)
  {
    productCode: 'NIC-001',
    description: 'Wasabi Ginger Candy - 100g Tin',
    productType: 'hard_candy',
    productGroup: 'premium',
    gtin: '012345678960',
    productCategory: 'Confectionery',
    status: '05',
  },
  {
    productCode: 'NIC-002',
    description: 'Lavender Honey Drops - 80g Bag',
    productType: 'hard_candy',
    productGroup: 'premium',
    gtin: '012345678961',
    productCategory: 'Confectionery',
    status: '05',
  },
  {
    productCode: 'NIC-003',
    description: 'Activated Charcoal Mints - 50g',
    productType: 'hard_candy',
    productGroup: 'premium',
    gtin: '012345678962',
    productCategory: 'Confectionery',
    status: '05',
  },
]

export async function seedProducts(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding candy products...')

  await db.insert(products).values(SEED_PRODUCTS)

  console.log(`Created ${SEED_PRODUCTS.length} candy products`)
}
