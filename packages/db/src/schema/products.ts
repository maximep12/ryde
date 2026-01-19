import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { date, index, serial, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

// ============================================================================
// PRODUCTS (Candy Products)
// ============================================================================

export const products = app.table(
  'products',
  {
    id: serial('id').primaryKey(),
    productCode: varchar('product_code', { length: 20 }).unique().notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    productType: varchar('product_type', { length: 20 }), // chocolate, gummy, hard_candy, lollipop, licorice
    productGroup: varchar('product_group', { length: 20 }), // premium, classic, sugar_free, seasonal
    gtin: varchar('gtin', { length: 50 }), // barcode/UPC
    productCategory: varchar('product_category', { length: 50 }), // Product, etc.
    status: varchar('status', { length: 10 }), // 03, 04, 05 (cross-plant status)
    statusValidFrom: date('status_valid_from'),
    oldProductNumber: varchar('old_product_number', { length: 20 }),
    ...timestamps,
  },
  (table) => [
    index('products_product_code_idx').on(table.productCode),
    index('products_product_type_idx').on(table.productType),
    index('products_product_group_idx').on(table.productGroup),
    index('products_status_idx').on(table.status),
  ],
)

export type Product = InferSelectModel<typeof products>
export type NewProduct = InferInsertModel<typeof products>
