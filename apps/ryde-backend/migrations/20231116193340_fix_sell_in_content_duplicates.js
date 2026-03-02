exports.up = async (knex) => {
  await knex.schema.raw(`
    ALTER TABLE "replen_orders_content"
    DROP CONSTRAINT IF EXISTS "replen_orders_content_billing_document_id_sku_unique"
  `)

  await knex.schema.alterTable('replen_orders_content', (t) => {
    t.integer('sales_document')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('replen_orders_content', (t) => {
    t.dropColumn('sales_document')
    t.unique(['billing_document_id', 'sku'])
  })
}
