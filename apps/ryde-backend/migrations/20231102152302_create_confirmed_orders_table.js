exports.up = async (knex) => {
  await knex.schema.createTable('replen_orders_confirmed', (t) => {
    t.increments('id').primary()
    t.date('document_date')
    t.integer('sales_document')
    t.integer('customer_id').references('customers.id')
    t.integer('sku').references('product_skus.sku')
    t.string('sales_unit')
    t.date('delivery_date')
    t.string('status')
    t.string('rejection_reason')
    t.integer('confirmed_quantity')

    t.timestamps(false, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('replen_orders_confirmed')
}
