exports.up = async (knex) => {
  await knex.schema.alterTable('replen_orders_confirmed', (t) => {
    t.unique(['sales_document', 'customer_id', 'sku'])
  })
}

exports.down = async (knex) => {
  await knex.schema.raw(`
  ALTER TABLE "replen_orders_confirmed"
  DROP CONSTRAINT IF EXISTS "replen_orders_confirmed_sales_document_customer_id_sku_unique"
`)
}
