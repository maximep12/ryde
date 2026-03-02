import {
  bigint,
  boolean,
  date,
  foreignKey,
  integer,
  json,
  pgTable,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const customers = pgTable(
  'customers',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    address: json(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    batId: integer('bat_id'),
    banner: varchar({ length: 255 }),
    priorityAccount: boolean('priority_account'),
    channel: varchar({ length: 255 }),
    bannerInternalId: varchar('banner_internal_id', { length: 255 }),
    isActive: boolean('is_active').default(true),
    country: varchar({ length: 255 }),
    state: varchar({ length: 255 }),
    area: varchar({ length: 255 }),
    subChannel: varchar('sub_channel', { length: 255 }),
    territory: varchar({ length: 255 }),
    phase: varchar({ length: 255 }),
    cluster: varchar({ length: 255 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    distributionCenter: bigint('distribution_center', { mode: 'number' }),
    advanceRegionId: varchar('advance_region_id', { length: 255 }),
    advanceDistrictId: varchar('advance_district_id', { length: 255 }),
    advanceTerritoryId: varchar('advance_territory_id', { length: 255 }),
    advanceUpdate: date('advance_update'),
    confirmedTarget: integer('confirmed_target'),
    advanceRegionName: varchar('advance_region_name', { length: 255 }),
    advanceDistrictName: varchar('advance_district_name', { length: 255 }),
    advanceTerritoryName: varchar('advance_territory_name', { length: 255 }),
    advanceRepName: varchar('advance_rep_name', { length: 255 }),
  },
  (table) => [
    foreignKey({
      columns: [table.distributionCenter],
      foreignColumns: [table.id],
      name: 'customers_distribution_center_foreign',
    }),
  ],
)
