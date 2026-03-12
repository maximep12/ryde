import { InferSelectModel, sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
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

// =============================================================================
// UPLOADED FILES
// Tracks all files stored in S3, imported from external storage
// =============================================================================

export const uploadedFiles = app.table(
  'uploaded_files',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: varchar('type', { length: 100 }).notNull(), // 'sell-in', 'customer', 'confirmed', 'amazon', etc.
    banner: varchar('banner', { length: 100 }), // 'circle_k', 'rabba' — null for non-banner-specific files
    name: varchar('name', { length: 500 }).notNull(), // Full S3 key (e.g. qa/banners/rabba/file.txt, prod/sell-in/file.xlsx)
    downloadPath: varchar('download_path', { length: 1000 }).notNull(), // API path: /download/:banner/:fileName or /download/:type/:fileName
    by: varchar('by', { length: 20 }).notNull(), // 'admin', 'sftp'
    uploadedBy: varchar('uploaded_by').references(() => users.id, { onDelete: 'set null' }), // null for sftp uploads
    storedAt: timestamp('stored_at').notNull(), // original storage date — preserved from S3 metadata
    ...timestamps,
  },
  (table) => [
    index('uploaded_files_type_idx').on(table.type),
    index('uploaded_files_banner_idx').on(table.banner),
    index('uploaded_files_stored_at_idx').on(table.storedAt),
  ],
)

export type UploadedFile = InferSelectModel<typeof uploadedFiles>
