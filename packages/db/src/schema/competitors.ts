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
  varchar,
} from 'drizzle-orm/pg-core'
import { customers } from './customers'
import { dataImports } from './data-imports'

export const competitorOrders = pgTable(
  'competitor_orders',
  {
    id: serial().primaryKey().notNull(),
    customerId: integer('customer_id'),
    brand: varchar({ length: 255 }),
    quantity: integer().notNull(),
    value: numeric({ precision: 8, scale: 2 }).notNull(),
    orderDate: date('order_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'competitor_orders_customer_id_foreign',
    }),
  ],
)

export const competitorSales = pgTable(
  'competitor_sales',
  {
    id: serial().primaryKey().notNull(),
    rydeUnits: integer('ryde_units'),
    rydeValue: real('ryde_value'),
    romUnits: integer('rom_units'),
    romValue: real('rom_value'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    customerId: bigint('customer_id', { mode: 'number' }).notNull(),
    fileImport: integer('file_import'),
    promoUnits: integer('promo_units').default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
      name: 'competitor_sales_customer_id_foreign',
    }),
    foreignKey({
      columns: [table.fileImport],
      foreignColumns: [dataImports.id],
      name: 'competitor_sales_file_import_foreign',
    }),
  ],
)
