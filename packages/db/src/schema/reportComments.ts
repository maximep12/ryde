import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { index, serial, text, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'
import { users } from './users'

// ============================================================================
// REPORT COMMENTS (Notes on Plant+Material Reports)
// ============================================================================

export const reportComments = app.table(
  'report_comments',
  {
    id: serial('id').primaryKey(),
    plantName: varchar('plant_name', { length: 255 }).notNull(),
    materialNumber: varchar('material_number', { length: 50 }).notNull(),
    userId: varchar('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    ...timestamps,
  },
  (table) => [
    index('report_comments_plant_material_idx').on(table.plantName, table.materialNumber),
    index('report_comments_user_id_idx').on(table.userId),
    index('report_comments_created_at_idx').on(table.createdAt),
  ],
)

export type ReportComment = InferSelectModel<typeof reportComments>
export type NewReportComment = InferInsertModel<typeof reportComments>
