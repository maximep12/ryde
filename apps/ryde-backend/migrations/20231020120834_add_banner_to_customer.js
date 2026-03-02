exports.up = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.string('banner')
  })

  await knex.raw(`
    UPDATE customers
    SET banner = CASE
      WHEN LOWER(name) LIKE '%rabba%' THEN 'Rabba'
      WHEN LOWER(name) LIKE '%circle k%' THEN 'Circle K'
      ELSE 'Independent'
      END
    `)
}

exports.down = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('banner')
  })
}
