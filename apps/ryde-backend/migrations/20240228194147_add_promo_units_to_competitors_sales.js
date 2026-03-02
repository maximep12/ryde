exports.up = async (knex) => {
  await knex.schema.alterTable('competitor_sales', (t) => {
    t.integer('promo_units').default(0)
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('competitor_sales', (t) => {
    t.dropColumn('promo_units')
  })
}
