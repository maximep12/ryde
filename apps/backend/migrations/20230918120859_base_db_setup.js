exports.up = async function (knex) {
  await knex.schema.createTable('customers', (t) => {
    t.increments('id').primary()
    t.string('name').notNullable()
    t.json('address')

    t.timestamps(false, true)
  })

  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary()
    t.string('name')
    t.string('description')
    t.boolean('is_wsc').defaultTo(true)

    t.timestamps(false, true)
  })

  await knex.schema.createTable('product_skus', (t) => {
    t.integer('product_id').references('products.id').index().notNullable().onDelete('CASCADE')
    t.integer('sku')
    t.unique(['product_id', 'sku'])

    t.timestamps(false, true)
  })

  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary()
    t.integer('customer_id').references('customers.id').notNullable()
    t.enu('status', ['accepted', 'refused', 'fulfilled', 'cancelled']).notNullable()

    t.timestamps(false, true)
  })

  await knex.schema.createTable('orders_content', (t) => {
    t.increments('id').primary()
    t.integer('order_id').references('orders.id').notNullable()
    t.integer('product_id').references('products.id').notNullable()
    t.integer('quantity').notNullable()
    t.unique(['order_id', 'product_id'])

    t.timestamps(false, true)
  })

  await knex.schema.createTable('replen_orders', (t) => {
    t.increments('id').primary()
    t.integer('customer_id').references('customers.id').notNullable()
    t.enu('status', ['accepted', 'refused', 'fulfilled', 'cancelled']).notNullable()

    t.timestamps(false, true)
  })

  await knex.schema.createTable('territories', (t) => {
    t.increments('id').primary()
    t.string('name').notNullable()
    t.timestamps(false, true)
  })
  await knex.schema.createTable('districts', (t) => {
    t.increments('id').primary()
    t.string('name').notNullable()
    t.timestamps(false, true)
  })
  await knex.schema.createTable('regions', (t) => {
    t.increments('id').primary()
    t.string('name').notNullable()
    t.timestamps(false, true)
  })

  await knex.schema.createTable('customer_territories', (t) => {
    t.integer('customer_id').references('customers.id').notNullable()
    t.integer('territory_id').references('territories.id').notNullable()
    t.boolean('is_primary').notNullable()
    t.timestamps(false, true)
  })
  await knex.schema.createTable('territory_districts', (t) => {
    t.integer('territory_id').references('territories.id').notNullable()
    t.integer('district_id').references('districts.id').notNullable()
    t.boolean('is_primary').notNullable()
    t.timestamps(false, true)
  })
  await knex.schema.createTable('district_regions', (t) => {
    t.integer('district_id').references('districts.id').notNullable()
    t.integer('region_id').references('regions.id').notNullable()
    t.boolean('is_primary').notNullable()
    t.timestamps(false, true)
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTable('customers')
  await knex.schema.dropTable('products')
  await knex.schema.dropTable('product_skus')
  await knex.schema.dropTable('orders')
  await knex.schema.dropTable('orders_content')
  await knex.schema.dropTable('replen_orders')
  await knex.schema.dropTable('territories')
  await knex.schema.dropTable('districts')
  await knex.schema.dropTable('regions')
  await knex.schema.dropTable('customer_territories')
  await knex.schema.dropTable('customer_districts')
  await knex.schema.dropTable('customer_regions')
}
