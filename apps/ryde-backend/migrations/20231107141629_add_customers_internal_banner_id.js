exports.up = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.string('banner_internal_id')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('banner_internal_id')
  })
}
