exports.up = async (knex) => {
  await knex.schema.createTable('report_status', (t) => {
    t.increments('id').primary().notNullable()
    t.string('type').notNullable()
    t.string('failure')
    t.json('warnings')
    t.date('report_start')
    t.date('report_end')
    t.integer('created').defaultTo(0)
    t.integer('updated').defaultTo(0)
    t.integer('deleted').defaultTo(0)
    t.json('extra')

    t.timestamps(false, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('report_status')
}
