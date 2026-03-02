exports.up = async function (knex) {
  await knex.schema.createTable('forecasts', (t) => {
    t.increments('id').primary().notNullable()
    t.integer('year').notNullable()
    t.integer('month').notNullable()
    t.string('sku').references('product_skus.sku').notNullable()
    t.float('quantity').notNullable()
    t.timestamps(false, true)
    t.unique(['year', 'month', 'sku'])
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTable('forecast')
}
