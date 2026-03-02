import {
  bigint,
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
import { customers } from './customers'
import { productSkus } from './products'

export const orders = pgTable(
  'orders',
  {
    id: serial().primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    customerId: bigint('customer_id', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    orderDate: date('order_date'),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'orders_customer_id_foreign',
    }),
    unique('orders_order_date_customer_id_unique').on(table.orderDate, table.customerId),
  ],
)

export const ordersContent = pgTable(
  'orders_content',
  {
    id: serial().primaryKey().notNull(),
    quantity: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    sku: varchar().notNull(),
    billingDocumentId: integer('billing_document_id').notNull(),
    netValue: real('net_value'),
    upc: varchar({ length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.billingDocumentId],
      foreignColumns: [orders.id],
      name: 'billing_document_id_refers_orders_id',
    }),
    foreignKey({
      columns: [table.sku],
      foreignColumns: [productSkus.sku],
      name: 'orders_content_sku_foreign',
    }),
    unique('orders_content_billing_document_id_upc_unique').on(table.upc, table.billingDocumentId),
  ],
)
