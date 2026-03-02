import {
  boolean,
  date,
  foreignKey,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const dataImports = pgTable('data_imports', {
  id: serial().primaryKey().notNull(),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  weeksIncluded: integer('weeks_included'),
  rydeWeek: integer('ryde_week'),
  fileOrigin: varchar('file_origin', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
})

export const reports = pgTable(
  'reports',
  {
    id: serial().primaryKey().notNull(),
    type: varchar({ length: 255 }).notNull(),
    failure: text(),
    warnings: json(),
    reportStart: timestamp('report_start', { mode: 'string' }),
    reportEnd: timestamp('report_end', { mode: 'string' }),
    created: integer().default(0),
    updated: integer().default(0),
    deleted: integer().default(0),
    extra: json(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    fileName: varchar('file_name', { length: 255 }),
    dataImportId: integer('data_import_id'),
    notifSent: boolean('notif_sent'),
  },
  (table) => [
    foreignKey({
      columns: [table.dataImportId],
      foreignColumns: [dataImports.id],
      name: 'reports_data_import_id_foreign',
    }),
  ],
)
