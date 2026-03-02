exports.up = async function (knex) {
  await knex.schema.createTable('replen_orders_content', (t) => {
    t.increments('id').primary()
    t.integer('order_id')
    t.integer('product_id').references('products.id').notNullable()
    t.integer('quantity').notNullable()
    t.unique(['order_id', 'product_id'])

    t.timestamps(false, true)
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTable('replen_orders_content')
}
