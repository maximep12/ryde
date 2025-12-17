import { pgSchema } from 'drizzle-orm/pg-core'

// Define the app schema - all tables will be created under this PostgreSQL schema
export const app = pgSchema('app')
