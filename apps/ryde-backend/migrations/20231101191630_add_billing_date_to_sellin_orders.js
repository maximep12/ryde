exports.up = async (knex) => {
  await knex.schema.alterTable('replen_orders', (t) => {
    t.date('billing_date')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('replen_orders', (t) => {
    t.dropColumn('billing_date')
  })
}
