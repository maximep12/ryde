import { index, serial, timestamp, varchar } from 'drizzle-orm/pg-core'

import { timestamps } from '../helpers'
import { app } from './app'
import { users } from './users'

/**
 * Report Validations Table
 *
 * Tracks validation history for supply & demand reports.
 * Reports are identified by plantName + materialNumber.
 * A validation becomes "stale" after 3 months and needs re-validation.
 */
export const reportValidations = app.table(
  'report_validations',
  {
    id: serial('id').primaryKey(),
    plantName: varchar('plant_name', { length: 255 }).notNull(),
    materialNumber: varchar('material_number', { length: 50 }).notNull(),
    validatedBy: varchar('validated_by')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    validatedAt: timestamp('validated_at').notNull(),
    ...timestamps,
  },
  (table) => [
    index('report_validations_plant_material_idx').on(table.plantName, table.materialNumber),
    index('report_validations_validated_by_idx').on(table.validatedBy),
    index('report_validations_validated_at_idx').on(table.validatedAt),
  ],
)
