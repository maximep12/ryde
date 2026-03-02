exports.up = async (knex) => {
  await knex.schema.createTable('competitor_sales', (t) => {
    t.increments('id').primary()
    t.integer('ryde_units')
    t.float('ryde_value')
    t.integer('rom_units')
    t.float('rom_value')
    t.date('period_start')
    t.date('period_end')
    t.string('file_origin')

    t.timestamps(false, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('competitor_sales')
}
