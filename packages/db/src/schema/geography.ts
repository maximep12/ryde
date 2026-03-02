import {
  foreignKey,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

export const districts = pgTable('districts', {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const regions = pgTable('regions', {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const territories = pgTable('territories', {
  id: serial().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const districtRegions = pgTable(
  'district_regions',
  {
    districtId: integer('district_id').notNull(),
    regionId: integer('region_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.districtId],
      foreignColumns: [districts.id],
      name: 'district_regions_district_id_foreign',
    }),
    foreignKey({
      columns: [table.regionId],
      foreignColumns: [regions.id],
      name: 'district_regions_region_id_foreign',
    }),
    unique('district_regions_unique_entry').on(table.regionId, table.districtId),
  ],
)

export const territoryDistricts = pgTable(
  'territory_districts',
  {
    territoryId: integer('territory_id').notNull(),
    districtId: integer('district_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.districtId],
      foreignColumns: [districts.id],
      name: 'territory_districts_district_id_foreign',
    }),
    foreignKey({
      columns: [table.territoryId],
      foreignColumns: [territories.id],
      name: 'territory_districts_territory_id_foreign',
    }),
    unique('territory_district_unique_entry').on(table.territoryId, table.districtId),
  ],
)
