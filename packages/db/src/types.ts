import * as schema from '@repo/db'
import { ExtractTablesWithRelations } from 'drizzle-orm'
import { NodePgClient, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { PgTransaction } from 'drizzle-orm/pg-core'
import { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

export type Database = NodePgDatabase<typeof schema> & {
  $client: NodePgClient
}
