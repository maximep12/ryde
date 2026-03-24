exports.up = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.boolean('is_active').default(true)
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('is_active')
  })
}
