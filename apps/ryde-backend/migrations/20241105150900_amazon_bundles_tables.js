exports.up = async (knex) => {
  await knex.schema.createTable('amazon_bundles', (t) => {
    t.string('asin').primary().notNullable()
    t.string('amazon_name').notNullable()
    t.string('product_1').notNullable()
    t.string('product_2').notNullable()
    t.string('product_3')

    t.timestamps(false, true)
  })

  const PRODUCTS = {
    enerigze: 'Energize',
    focus: 'Focus',
    relax: 'Relax',
  }

  await knex('amazon_bundles').insert([
    {
      asin: 'B0D7J2XMR5',
      amazon_name:
        'RYDE Shots | Energize + Focus | Essential B Vitamins and Caffeine| Zero Calories, Zero Sugar | Pack of 16',
      product_1: PRODUCTS.enerigze,
      product_2: PRODUCTS.focus,
    },
    {
      asin: 'B0D6WLVYVH',
      amazon_name:
        'RYDE Bundle | Relax + Focus Shots | L-Theanine, Ginseng, Chamomile and Caffeine| Zero Calories, Zero Sugar | Pack of 16',
      product_1: PRODUCTS.focus,
      product_2: PRODUCTS.relax,
    },
    {
      asin: 'B0D4NKDM4S',
      amazon_name:
        'Ryde Shots Variety Pack| Energy, Focus & Relax| Essential B Vitamins and Caffeine| Zero Calories, Zero Sugar - Try them all (Pack of 24)',
      product_1: PRODUCTS.enerigze,
      product_2: PRODUCTS.focus,
      product_3: PRODUCTS.relax,
    },
    {
      asin: 'B0D6WM3G9Y',
      amazon_name:
        'RYDE Shots | Energize + Relax | Essential B Vitamins, Ginseng, Chamomile and Caffeine| Zero Calories, Zero Sugar | Pack of 16',
      product_1: PRODUCTS.enerigze,
      product_2: PRODUCTS.relax,
    },
  ])

  await knex.schema.createTable('amazon_bundles_orders', (t) => {
    t.string('asin').references('amazon_bundles.asin').notNullable()
    t.date('date').notNullable()
    t.integer('quantity').notNullable()
    t.float('net_value').notNullable()
    t.unique(['asin', 'date'])

    t.timestamps(false, true)
  })
}

exports.down = async (knex) => {
  await knex.schema.dropTable('amazon_bundles_orders')
  await knex.schema.dropTable('amazon_bundles')
}
