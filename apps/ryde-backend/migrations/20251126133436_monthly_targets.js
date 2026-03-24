exports.up = async (knex) => {
  await knex.schema.createTable('periods', (t) => {
    t.increments('id').primary().notNullable()
    t.string('name').notNullable()
    t.date('start_date').notNullable()
    t.date('end_date').notNullable()

    t.unique(['name', 'start_date', 'end_date'])
    t.timestamps(false, true)
  })

  await knex.schema.createTable('customer_targets', (t) => {
    t.bigInteger('customer_id').references('customers.id').notNullable()
    t.integer('target').notNullable()
    t.integer('period_id').references('periods.id').notNullable()

    t.unique(['customer_id', 'period_id'])
    t.timestamps(false, true)
  })

  await knex('periods').insert({ name: 'Nov-Dec 2025', start_date: '2025-11-01', end_date: '2025-12-31' })
  await knex.raw(`
    INSERT INTO customer_targets (customer_id, target, period_id)
    SELECT id, confirmed_target, (SELECT id FROM periods ORDER BY id LIMIT 1)
    FROM customers
    WHERE confirmed_target != 0
  `)
}

exports.down = async (knex) => {
  await knex.schema.dropTable('customer_targets')
  await knex.schema.dropTable('periods')
}
