import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { serial, varchar } from 'drizzle-orm/pg-core'
import { timestamps } from '../helpers'
import { app } from './app'

// ============================================================================
// PLANTS (Manufacturing Facilities)
// ============================================================================

export const plants = app.table('plants', {
  id: serial('id').primaryKey(),
  acronym: varchar('acronym', { length: 10 }).unique().notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).notNull(),
  ...timestamps,
})

export type Plant = InferSelectModel<typeof plants>
export type NewPlant = InferInsertModel<typeof plants>
