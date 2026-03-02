exports.up = async (knex) => {
  await knex.schema.createTable('customers_upc', (t) => {
    t.increments('id').primary().notNullable()
    t.integer('format_id').references('product_formats.id').notNullable()
    t.string('customer_upc').notNullable()
    t.string('banner').notNullable()

    t.timestamps(false, true)
  })

  const existingUPCs = [
    {
      format_id: 48,
      customer_upc: '0062812002000',
      banner: 'RABBA/VARIETY FOOD FAIR',
    },
    {
      format_id: 53,
      customer_upc: '0062812002003',
      banner: 'RABBA/VARIETY FOOD FAIR',
    },
    {
      format_id: 54,
      customer_upc: '0062812002004',
      banner: 'RABBA/VARIETY FOOD FAIR',
    },
    {
      format_id: 58,
      customer_upc: '0062812002007',
      banner: 'RABBA/VARIETY FOOD FAIR',
    },
    {
      format_id: 59,
      customer_upc: '0062812002008',
      banner: 'RABBA/VARIETY FOOD FAIR',
    },
  ]

  await knex('customers_upc').insert(existingUPCs)
}

exports.down = async (knex) => {
  await knex.schema.dropTable('customers_upc')
}
