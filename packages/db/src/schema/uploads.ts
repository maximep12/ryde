import { InferSelectModel, sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, uuid, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'
import { users } from './users'

// =============================================================================
// UPLOADS TO S3
// Tracks all file uploads to S3
// =============================================================================

export const uploadsToS3 = app.table(
  'uploads_to_s3',
  {
    uuid: uuid('uuid')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    fileKey: varchar('file_key', { length: 500 }).notNull(),
    localFileName: varchar('local_file_name', { length: 500 }),
    attributes: jsonb('attributes').$type<Record<string, string>>(),
    error: varchar('error', { length: 1000 }),
    ...timestamps,
  },
  (table) => {
    return [
      index('uploads_to_s3_user_id_idx').on(table.userId),
      index('uploads_to_s3_type_idx').on(table.type),
      index('uploads_to_s3_file_name_idx').on(table.fileName),
    ]
  },
)

export type UploadsToS3 = InferSelectModel<typeof uploadsToS3>

// =============================================================================
// UPLOADS APP RESULTS
// Stores processing results for uploaded files
// =============================================================================

export const uploadsResults = app.table(
  'uploads_results',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    uploadId: uuid('upload_id')
      .references(() => uploadsToS3.uuid, { onDelete: 'cascade' })
      .notNull(),
    rowIndex: integer('row_index').notNull(),
    data: jsonb('data'),
    validationDetails: jsonb('validation_details'),
    isValid: boolean('is_valid').default(false),
    isProcessed: boolean('is_processed').default(false),
    ...timestamps,
  },
  (table) => {
    return [index('uploads_results_upload_id_idx').on(table.uploadId)]
  },
)

export type uploadsResults = InferSelectModel<typeof uploadsResults>
