import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { index, integer, serial, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

// ============================================================================
// ONE LINE S&D (Supply & Demand data by material, plant, and purchasing group)
// ============================================================================

export const oneLineSd = app.table(
  'one_line_sd',
  {
    id: serial('id').primaryKey(),
    plantName: varchar('plant_name', { length: 255 }).notNull(),
    materialNumber: varchar('material_number', { length: 50 }).notNull(),
    materialDescription: varchar('material_description', { length: 255 }),
    purchasingGroup: varchar('purchasing_group', { length: 20 }),
    purchasingGroupName: varchar('purchasing_group_name', { length: 255 }),
    safetyStock: integer('safety_stock').default(0),
    materialGroup: varchar('material_group', { length: 20 }),
    plannedDeliveryTime: integer('planned_delivery_time'),
    ...timestamps,
  },
  (table) => [
    index('one_line_sd_plant_name_idx').on(table.plantName),
    index('one_line_sd_material_number_idx').on(table.materialNumber),
    index('one_line_sd_material_group_idx').on(table.materialGroup),
    index('one_line_sd_purchasing_group_idx').on(table.purchasingGroup),
  ],
)

export type OneLineSd = InferSelectModel<typeof oneLineSd>
export type NewOneLineSd = InferInsertModel<typeof oneLineSd>
