exports.up = async (knex) => {
  await knex.schema.alterTable('amazon_orders', (t) => {
    t.dropColumn('sku')
    t.dropColumn('quantity')
    t.string('ship_state')
    t.string('order_status')
    t.unique(['order_id'])
  })
  await knex.schema.createTable('amazon_orders_content', (t) => {
    t.increments('id').primary().notNullable()
    t.string('order_id').notNullable().references('amazon_orders.order_id').onDelete('CASCADE')
    t.integer('sku').references('product_skus.sku').notNullable()
    t.integer('quantity').notNullable()
    t.float('net_value')

    t.timestamps(false, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('amazon_orders_content')

  await knex.schema.alterTable('amazon_orders', (t) => {
    t.integer('sku').references('product_skus.sku').notNullable()
    t.integer('quantity').notNullable()
    t.dropColumn('ship_state')
    t.dropColumn('order_status')
  })

  await knex.raw(`
    ALTER TABLE amazon_orders 
    DROP CONSTRAINT IF EXISTS amazon_orders_order_id_unique;
  `)
}
