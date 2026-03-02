exports.up = async (knex) => {
  await knex.raw(`
  ALTER TABLE orders_content 
  DROP CONSTRAINT IF EXISTS orders_content_product_id_foreign;
  `)

  await knex.raw(`
    ALTER TABLE orders_content 
    DROP CONSTRAINT IF EXISTS orders_content_order_id_product_id_unique;
    ALTER TABLE orders_content 
    DROP COLUMN product_id;    
`)

  await knex.schema.alterTable('orders', (t) => {
    t.integer('billing_document_id').unique().notNullable()
    t.dropColumn('status')
  })

  await knex.schema.alterTable('orders_content', (t) => {
    t.integer('sku').references('product_skus.sku').notNullable()
    t.integer('billing_document_id').references('replen_orders.billing_document_id').notNullable().onDelete('CASCADE')
    t.unique(['billing_document_id', 'sku'])
    t.dropColumn('order_id')
  })
}

exports.down = async (knex) => {
  await knex.raw(`
    ALTER TABLE orders_content 
    DROP CONSTRAINT IF EXISTS orders_content_unique_entry
  `)

  await knex.raw(`
  ALTER TABLE orders_content 
  DROP CONSTRAINT IF EXISTS orders_content_unique_entry
`)

  await knex.schema.alterTable('orders_content', (t) => {
    t.dropColumn('billing_document_id')
    t.dropColumn('sku')
    t.integer('product_id').references('products.id')
    t.integer('order_id').references('orders.id')
  })

  await knex.schema.alterTable('orders', (t) => {
    t.dropColumn('billing_document_id')
    t.string('status')
  })

  await knex.raw(`
  ALTER TABLE orders_content 
  ADD CONSTRAINT orders_content_order_id_product_id_unique UNIQUE(order_id,product_id);
`)
}
