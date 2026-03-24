exports.up = async (knex) => {
  await knex.schema.alterTable('product_formats', (t) => {
    t.integer('product_id').references('products.id')
  })

  await knex.raw(`
    UPDATE product_formats set product_id = (SELECT product_id from product_skus where sku = product_formats.product_sku);
    INSERT INTO product_formats (numerator, denominator, unit, product_id) values (6,1000,'CAR',34);
    `)

  await knex.schema.alterTable('product_formats', (t) => {
    t.dropColumn('product_sku')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('product_formats', (t) => {
    t.dropColumn('product_id')
  })

  await knex.schema.alterTable('product_formats', (t) => {
    t.string('sku').references('product_skus.sku')
  })
}
