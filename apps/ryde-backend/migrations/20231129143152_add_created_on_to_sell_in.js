exports.up = async (knex) => {
  await knex.schema.alterTable('replen_orders', (t) => {
    t.date('creation_date')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('replen_orders', (t) => {
    t.dropColumn('creation_date')
  })
}
