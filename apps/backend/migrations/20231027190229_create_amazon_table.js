exports.up = async function (knex) {
  await knex.schema.createTable('amazon_orders', (t) => {
    t.increments('id').primary().notNullable()
    t.string('order_id').notNullable()
    t.integer('sku').references('product_skus.sku').notNullable()
    t.integer('quantity').notNullable()
    t.float('net_value')
    t.timestamp('order_date')

    t.timestamps(false, true)
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTable('amazon_orders')
}
