exports.up = async (knex) => {
  await knex.schema.alterTable('customer_territories', (t) => {
    t.dropColumn('is_primary')
  })

  await knex.schema.alterTable('territory_districts', (t) => {
    t.dropColumn('is_primary')
  })

  await knex.schema.alterTable('district_regions', (t) => {
    t.dropColumn('is_primary')
  })

  await knex.schema.alterTable('customers', (t) => {
    t.boolean('channel')
    t.boolean('priority_account')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('customer_territories', (t) => {
    t.boolean('is_primary')
  })

  await knex.schema.alterTable('territory_districts', (t) => {
    t.boolean('is_primary')
  })

  await knex.schema.alterTable('district_regions', (t) => {
    t.boolean('is_primary')
  })

  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('channel')
    t.dropColumn('priority_account')
  })
}
