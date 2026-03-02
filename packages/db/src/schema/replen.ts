import {
  bigint,
  date,
  foreignKey,
  integer,
  numeric,
  pgTable,
  real,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'
import { customers } from './customers'
import { productSkus } from './products'

export const replenOrders = pgTable(
  'replen_orders',
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
    billingDocumentId: integer('billing_document_id').notNull(),
    billingDate: date('billing_date'),
    creationDate: date('creation_date'),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'replen_orders_customer_id_foreign',
    }),
    unique('replen_orders_billing_document_id_unique').on(table.billingDocumentId),
  ],
)

export const replenOrdersConfirmed = pgTable(
  'replen_orders_confirmed',
  {
    id: serial().primaryKey().notNull(),
    documentDate: date('document_date'),
    salesDocument: varchar('sales_document'),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    customerId: bigint('customer_id', { mode: 'number' }),
    sku: varchar(),
    salesUnit: varchar('sales_unit', { length: 255 }),
    deliveryDate: date('delivery_date'),
    status: varchar({ length: 255 }),
    rejectionReason: varchar('rejection_reason', { length: 255 }),
    confirmedQuantity: integer('confirmed_quantity'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    netValue: numeric('net_value', { precision: 10, scale: 2 }),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'replen_orders_confirmed_customer_id_foreign',
    }),
    foreignKey({
      columns: [table.sku],
      foreignColumns: [productSkus.sku],
      name: 'replen_orders_confirmed_sku_foreign',
    }),
    unique('replen_orders_confirmed_sales_document_customer_id_sku_unique').on(
      table.sku,
      table.salesDocument,
      table.customerId,
    ),
  ],
)

export const replenOrdersContent = pgTable(
  'replen_orders_content',
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
    salesDocument: integer('sales_document'),
  },
  (table) => [
    foreignKey({
      columns: [table.billingDocumentId],
      foreignColumns: [replenOrders.billingDocumentId],
      name: 'replen_orders_content_billing_document_id_foreign',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.sku],
      foreignColumns: [productSkus.sku],
      name: 'replen_orders_content_sku_foreign',
    }),
  ],
)
