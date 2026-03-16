import {
  boolean,
  foreignKey,
  index,
  integer,
  pgTable,
  real,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }),
  description: varchar({ length: 255 }),
  isWsc: boolean('is_wsc').default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const productFormats = pgTable(
  'product_formats',
  {
    id: serial().primaryKey().notNull(),
    numerator: integer(),
    denominator: integer(),
    unit: varchar({ length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    upc: varchar({ length: 255 }),
    productId: integer('product_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_formats_product_id_foreign',
    }),
  ],
)

export const productSkus = pgTable(
  'product_skus',
  {
    productId: integer('product_id').notNull(),
    sku: varchar(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    isActive: boolean('is_active').default(true),
    asin: varchar({ length: 255 }),
    formatId: integer('format_id').notNull(),
    amazonCountry: varchar('amazon_country', { length: 255 }),
  },
  (table) => [
    index().using('btree', table.productId.asc().nullsLast().op('int4_ops')),
    foreignKey({
      columns: [table.formatId],
      foreignColumns: [productFormats.id],
      name: 'product_skus_format_id_foreign',
    }),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_skus_product_id_foreign',
    }).onDelete('cascade'),
    unique('product_skus_product_id_sku_unique').on(table.sku, table.productId),
    unique('unique_sku_check').on(table.sku),
  ],
)

export const forecasts = pgTable(
  'forecasts',
  {
    id: serial().primaryKey().notNull(),
    year: integer().notNull(),
    month: integer().notNull(),
    sku: varchar({ length: 255 }).notNull(),
    quantity: real().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.sku],
      foreignColumns: [productSkus.sku],
      name: 'forecasts_sku_foreign',
    }),
    unique('forecasts_year_month_sku_unique').on(table.year, table.sku, table.month),
  ],
)
