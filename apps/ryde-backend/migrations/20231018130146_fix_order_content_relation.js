exports.up = async (knex) => {
  await knex.raw(`
    ALTER TABLE orders_content 
    DROP CONSTRAINT IF EXISTS orders_content_billing_document_id_foreign;
    ALTER TABLE orders_content 
    DROP CONSTRAINT IF EXISTS orders_content_billing_document_id_sku_unique;
  `)

  await knex.schema.alterTable('orders_content', (t) => {
    t.dropColumn('billing_document_id')
  })

  await knex.schema.alterTable('orders_content', (t) => {
    t.integer('billing_document_id').references('orders.billing_document_id').notNullable().onDelete('CASCADE')
    t.unique(['billing_document_id', 'sku'])
  })
}

exports.down = async (knex) => {
  await knex.raw(`
    ALTER TABLE orders_content 
    DROP CONSTRAINT IF EXISTS orders_content_unique_entry;
    ALTER TABLE orders_content 
    DROP CONSTRAINT IF EXISTS orders_content_billing_document_id_sku_unique;
`)

  await knex.schema.alterTable('orders_content', (t) => {
    t.dropColumn('billing_document_id')
  })

  await knex.schema.alterTable('orders_content', (t) => {
    t.integer('billing_document_id').references('replen_orders.billing_document_id').notNullable().onDelete('CASCADE')
    t.unique(['billing_document_id', 'sku'])
  })
}
