exports.up = async (knex) => {
  await knex.schema.alterTable('competitor_sales', (t) => {
    t.integer('customer_id').references('customers.id')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('competitor_sales', (t) => {
    t.dropColumn('customer_id')
  })
}
