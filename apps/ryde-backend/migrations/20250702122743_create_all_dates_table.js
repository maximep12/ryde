exports.up = async function (knex) {
  await knex.schema.createTable('available_dates', (t) => {
    t.date('date').primary().notNullable()
  })

  await knex.raw(`
    INSERT INTO available_dates (date)
    SELECT generate_series('2023-10-01'::date, '2030-12-31'::date, interval '1 day')::date
  `)
}

exports.down = async function (knex) {
  await knex.schema.dropTable('available_dates')
}
