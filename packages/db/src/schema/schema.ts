import { sql } from 'drizzle-orm'
import {
  bigint,
  date,
  integer,
  pgMaterializedView,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const availableDates = pgTable('available_dates', {
  date: date().primaryKey().notNull(),
})

export const knexMigrations = pgTable('knex_migrations', {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }),
  batch: integer(),
  migrationTime: timestamp('migration_time', { withTimezone: true, mode: 'string' }),
})

export const knexMigrationsLock = pgTable('knex_migrations_lock', {
  index: serial().primaryKey().notNull(),
  isLocked: integer('is_locked'),
})

export const customersVelocity = pgMaterializedView('customers_velocity', {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  customerId: bigint('customer_id', { mode: 'number' }),
  rydeWeek: integer('ryde_week'),
  velocity: integer(),
}).as(
  sql`WITH known_sales AS ( SELECT competitor_sales.customer_id, data_imports.ryde_week, competitor_sales.ryde_units AS velocity FROM competitor_sales LEFT JOIN data_imports ON competitor_sales.file_import = data_imports.id ORDER BY competitor_sales.customer_id, data_imports.ryde_week ), no_sell_out_customers AS ( SELECT customers.id AS customer_id FROM customers WHERE NOT (customers.id IN ( SELECT known_sales.customer_id FROM known_sales)) ), unknown_velocity_customers_sell_in_week AS ( SELECT replen_orders.customer_id, min(replen_orders.billing_date) AS first_sell_in FROM replen_orders WHERE (replen_orders.customer_id IN ( SELECT no_sell_out_customers.customer_id FROM no_sell_out_customers)) GROUP BY replen_orders.customer_id ORDER BY replen_orders.customer_id ), ryde_week_first_sell_in AS ( SELECT unknown_velocity_customers_sell_in_week.customer_id, unknown_velocity_customers_sell_in_week.first_sell_in, data_imports.ryde_week FROM unknown_velocity_customers_sell_in_week LEFT JOIN data_imports ON data_imports.period_start <= unknown_velocity_customers_sell_in_week.first_sell_in AND data_imports.period_end >= unknown_velocity_customers_sell_in_week.first_sell_in ), customer_fake_sales AS ( SELECT ryde_week_first_sell_in.customer_id, generate_series(ryde_week_first_sell_in.ryde_week, ( SELECT max(data_imports.ryde_week) AS max FROM data_imports)) AS ryde_week, 8 AS velocity FROM ryde_week_first_sell_in ) SELECT known_sales.customer_id, known_sales.ryde_week, known_sales.velocity FROM known_sales UNION SELECT customer_fake_sales.customer_id, customer_fake_sales.ryde_week, customer_fake_sales.velocity FROM customer_fake_sales ORDER BY 1, 2`,
)
