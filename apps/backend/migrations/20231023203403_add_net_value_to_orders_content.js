exports.up = async (knex) => {
  await knex.schema.alterTable('replen_orders_content', (t) => {
    t.float('net_value')
  })

  await knex.schema.alterTable('orders_content', (t) => {
    t.float('net_value')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('replen_orders_content', (t) => {
    t.dropColumn('net_value')
  })

  await knex.schema.alterTable('orders_content', (t) => {
    t.dropColumn('net_value')
  })
}
