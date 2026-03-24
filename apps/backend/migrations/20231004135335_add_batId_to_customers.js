exports.up = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.integer('bat_id')
  })

  await knex.raw(`
    ALTER TABLE customers ALTER COLUMN id DROP DEFAULT
  `)

  await knex.raw(`
    ALTER TABLE district_regions 
    ADD CONSTRAINT district_regions_unique_entry UNIQUE (district_id, region_id)
  `)

  await knex.raw(`
    ALTER TABLE territory_districts 
    ADD CONSTRAINT territory_district_unique_entry UNIQUE (territory_id, district_id)
`)

  await knex.raw(`
    ALTER TABLE customer_territories 
    ADD CONSTRAINT customer_territory_unique_entry UNIQUE (territory_id, customer_id)
`)
}

exports.down = async (knex) => {
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('bat_id')
  })

  await knex.raw(`
    ALTER TABLE district_regions 
    DROP CONSTRAINT district_regions_unique_entry
  `)
  await knex.raw(`
    ALTER TABLE territory_districts 
    DROP CONSTRAINT territory_district_unique_entry
  `)

  await knex.raw(`
    ALTER TABLE customer_territories 
    DROP CONSTRAINT customer_territory_unique_entry
  `)
}
