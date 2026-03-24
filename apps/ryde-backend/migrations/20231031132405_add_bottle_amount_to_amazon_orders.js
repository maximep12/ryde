exports.up = async (knex) => {
  await knex.schema.alterTable('amazon_orders', (t) => {
    t.dropColumn('net_value')
  })
  await knex.schema.alterTable('amazon_orders_content', (t) => {
    t.integer('pack_size')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('amazon_orders', (t) => {
    t.float('net_value')
  })
  await knex.schema.alterTable('amazon_orders_content', (t) => {
    t.dropColumn('pack_size')
  })
}
