exports.up = async (knex) => {
  await knex.schema.alterTable('replen_orders_confirmed', (t) => {
    t.float('net_value')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('replen_orders_confirmed', (t) => {
    t.dropColumn('net_value')
  })
}
