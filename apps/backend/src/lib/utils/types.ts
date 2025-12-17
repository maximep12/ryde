import { InferModelFromColumns } from 'drizzle-orm'
import { PgColumn, PgMaterializedView, PgView } from 'drizzle-orm/pg-core'

export type InferViewSelectModel<M extends PgView<string, boolean, Record<string, PgColumn>>> =
  InferModelFromColumns<M['_']['selectedFields'], 'select'>

export type InferMatViewSelectModel<
  M extends PgMaterializedView<string, boolean, Record<string, PgColumn>>,
> = InferModelFromColumns<M['_']['selectedFields'], 'select'>

export type ColumnSort = {
  desc: boolean
  id: string
}
