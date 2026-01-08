import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { index, integer, serial, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

// ============================================================================
// INVENTORY (Stock levels by material, plant, and storage location)
// ============================================================================

export const inventory = app.table(
  'inventory',
  {
    id: serial('id').primaryKey(),
    material: varchar('material', { length: 50 }).notNull(),
    materialDescription: varchar('material_description', { length: 255 }),
    plant: varchar('plant', { length: 10 }).notNull(),
    plantName: varchar('plant_name', { length: 255 }),
    storageLocation: varchar('storage_location', { length: 20 }),
    storageLocationDescription: varchar('storage_location_description', { length: 255 }),
    specialStockType: varchar('special_stock_type', { length: 10 }),
    specialStockTypeDescription: varchar('special_stock_type_description', { length: 255 }),
    unrestrictedStock: integer('unrestricted_stock').default(0).notNull(),
    stockInQualityInspection: integer('stock_in_quality_inspection').default(0).notNull(),
    blockedStock: integer('blocked_stock').default(0).notNull(),
    baseUnit: varchar('base_unit', { length: 10 }),
    ...timestamps,
  },
  (table) => [
    index('inventory_material_idx').on(table.material),
    index('inventory_plant_idx').on(table.plant),
    index('inventory_storage_location_idx').on(table.storageLocation),
    index('inventory_base_unit_idx').on(table.baseUnit),
  ],
)

export type Inventory = InferSelectModel<typeof inventory>
export type NewInventory = InferInsertModel<typeof inventory>
