import {
  bigint,
  date,
  foreignKey,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'
import { customers } from './customers'
import { productFormats } from './products'
import { territories } from './geography'

export const periods = pgTable(
  'periods',
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('periods_name_start_date_end_date_unique').on(
      table.startDate,
      table.name,
      table.endDate,
    ),
  ],
)

export const customerProductStatus = pgTable(
  'customer_product_status',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    customerId: bigint('customer_id', { mode: 'number' }).notNull(),
    statusDate: date('status_date').notNull(),
    placements: integer(),
    facings: integer(),
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
      name: 'customer_product_status_customer_id_foreign',
    }),
    unique('customer_product_status_customer_id_status_date_unique').on(
      table.statusDate,
      table.customerId,
    ),
  ],
)

export const customerTargets = pgTable(
  'customer_targets',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    customerId: bigint('customer_id', { mode: 'number' }).notNull(),
    target: integer().notNull(),
    periodId: integer('period_id').notNull(),
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
      name: 'customer_targets_customer_id_foreign',
    }),
    foreignKey({
      columns: [table.periodId],
      foreignColumns: [periods.id],
      name: 'customer_targets_period_id_foreign',
    }),
    unique('customer_targets_customer_id_period_id_unique').on(table.periodId, table.customerId),
  ],
)

export const customerTerritories = pgTable(
  'customer_territories',
  {
    customerId: integer('customer_id').notNull(),
    territoryId: integer('territory_id').notNull(),
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
      name: 'customer_territories_customer_id_foreign',
    }),
    foreignKey({
      columns: [table.territoryId],
      foreignColumns: [territories.id],
      name: 'customer_territories_territory_id_foreign',
    }),
    unique('customer_territory_unique_entry').on(table.territoryId, table.customerId),
  ],
)

export const customersUpc = pgTable(
  'customers_upc',
  {
    id: serial().primaryKey().notNull(),
    formatId: integer('format_id').notNull(),
    customerUpc: varchar('customer_upc', { length: 255 }).notNull(),
    banner: varchar({ length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.formatId],
      foreignColumns: [productFormats.id],
      name: 'customers_upc_format_id_foreign',
    }),
  ],
)
