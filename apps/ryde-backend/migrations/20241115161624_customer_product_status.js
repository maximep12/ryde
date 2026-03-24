exports.up = async (knex) => {
  await knex.schema.createTable('customer_product_status', (t) => {
    t.integer('customer_id').references('customers.id').notNullable()
    t.date('status_date').notNullable()
    t.integer('placements')
    t.integer('facings')

    t.unique(['customer_id', 'status_date'])
    t.timestamps(false, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('customer_product_status')
}
