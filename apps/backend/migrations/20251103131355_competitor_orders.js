exports.up = async (knex) => {
  await knex.schema.createTable('competitor_orders', (t) => {
    t.increments('id').primary().notNullable()
    t.integer('customer_id').references('customers.id')
    t.string('brand')
    t.integer('quantity').notNullable()
    t.decimal('value').notNullable()
    t.date('order_date').notNullable()

    t.timestamps(false, true)
  })

  await knex.raw(`
    with competitor_existing as (
      SELECT
        customer_id,
        rom_units,
        rom_value,
        period_start
      from competitor_sales
      join data_imports on data_imports.id = competitor_sales.file_import
    )
    insert into competitor_orders (customer_id, quantity, value, order_date)
    select
      customer_id,
      rom_units as quantity,
      rom_value as value,
      period_start as order_date
    from competitor_existing
    where rom_units > 0 or rom_value > 0;
    DELETE FROM orders where id not in (SELECT distinct billing_document_id from orders_content);
  `)
}

exports.down = async (knex) => {
  await knex.schema.dropTable('competitor_orders')
}
