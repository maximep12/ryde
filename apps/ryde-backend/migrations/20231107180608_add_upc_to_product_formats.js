exports.up = async (knex) => {
  await knex.schema.alterTable('product_formats', (t) => {
    t.string('upc')
  })

  await knex.schema.raw(`
  ALTER TABLE "orders_content"
  DROP CONSTRAINT IF EXISTS "orders_content_billing_document_id_foreign";
  ALTER TABLE "orders_content"
  DROP CONSTRAINT IF EXISTS "orders_content_billing_document_id_sku_unique";`)

  await knex.schema.alterTable('orders_content', (t) => {
    t.string('upc')
    t.unique(['billing_document_id', 'upc'])
  })

  await knex.schema.alterTable('orders', (t) => {
    t.date('order_date')
    t.dropColumn('billing_document_id')
    t.unique(['order_date', 'customer_id'])
  })

  await knex.schema.raw(`
    ALTER TABLE "orders_content"
      ADD CONSTRAINT billing_document_id_refers_orders_id 
      FOREIGN KEY(billing_document_id) 
      REFERENCES orders (id);`)
}

exports.down = async (knex) => {
  await knex.schema.alterTable('product_formats', (t) => {
    t.dropColumn('upc')
  })

  await knex.schema.alterTable('orders_content', (t) => {
    t.dropColumn('upc')
  })

  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('order_date')
    t.integer('billing_document_id')
  })
}
