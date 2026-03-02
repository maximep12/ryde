exports.up = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('channel')
  })

  await knex.schema.alterTable('customers', (t) => {
    t.string('channel')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('channel')
  })

  await knex.schema.alterTable('customers', (t) => {
    t.boolean('channel')
  })
}
