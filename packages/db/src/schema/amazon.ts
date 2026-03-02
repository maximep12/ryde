import {
  date,
  foreignKey,
  integer,
  pgTable,
  real,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'
import { productSkus } from './products'

export const amazonBundles = pgTable('amazon_bundles', {
  asin: varchar({ length: 255 }).primaryKey().notNull(),
  amazonName: varchar('amazon_name', { length: 255 }).notNull(),
  product1: varchar('product_1', { length: 255 }).notNull(),
  product2: varchar('product_2', { length: 255 }).notNull(),
  product3: varchar('product_3', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  country: varchar({ length: 255 }).default('US'),
})

export const amazonBundlesOrders = pgTable(
  'amazon_bundles_orders',
  {
    asin: varchar({ length: 255 }).notNull(),
    date: date().notNull(),
    quantity: integer().notNull(),
    netValue: real('net_value').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.asin],
      foreignColumns: [amazonBundles.asin],
      name: 'amazon_bundles_orders_asin_foreign',
    }),
    unique('amazon_bundles_orders_asin_date_unique').on(table.date, table.asin),
  ],
)

export const amazonOrders = pgTable(
  'amazon_orders',
  {
    id: serial().primaryKey().notNull(),
    orderId: varchar('order_id', { length: 255 }).notNull(),
    orderDate: timestamp('order_date', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    shipState: varchar('ship_state', { length: 255 }),
    orderStatus: varchar('order_status', { length: 255 }),
    country: varchar({ length: 255 }).default('CA'),
  },
  (table) => [unique('amazon_orders_order_id_unique').on(table.orderId)],
)

export const amazonOrdersContent = pgTable(
  'amazon_orders_content',
  {
    id: serial().primaryKey().notNull(),
    orderId: varchar('order_id', { length: 255 }).notNull(),
    sku: varchar().notNull(),
    quantity: integer().notNull(),
    netValue: real('net_value'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    packSize: integer('pack_size'),
    currency: varchar({ length: 255 }).default('CA'),
    asin: varchar({ length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [amazonOrders.orderId],
      name: 'amazon_orders_content_order_id_foreign',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sku],
      foreignColumns: [productSkus.sku],
      name: 'amazon_orders_content_sku_foreign',
    }),
  ],
)
