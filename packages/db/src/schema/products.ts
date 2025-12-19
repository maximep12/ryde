import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { index, integer, serial, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

// ============================================================================
// PRODUCTS
// ============================================================================

export const products = app.table(
  'products',
  {
    id: serial('id').primaryKey(),
    sku: varchar('sku', { length: 50 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(), // OdourLock, Odour Buster, Classic
    packageType: varchar('package_type', { length: 30 }).notNull(), // jug, bucket, box, plastic_bag
    price: integer('price').notNull(), // stored in cents
    ...timestamps,
  },
  (table) => [
    index('products_sku_idx').on(table.sku),
    index('products_category_idx').on(table.category),
    index('products_package_type_idx').on(table.packageType),
  ],
)

export type Product = InferSelectModel<typeof products>
export type NewProduct = InferInsertModel<typeof products>
