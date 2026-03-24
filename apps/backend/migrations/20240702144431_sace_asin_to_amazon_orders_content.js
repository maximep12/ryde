exports.up = async (knex) => {
  await knex.schema.alterTable('amazon_orders_content', (t) => {
    t.string('asin')
  })

  await knex.schema.alterTable('product_skus', (t) => {
    t.string('asin')
    t.integer('format_id').references('product_formats.id')
    t.dropColumn('is_amazon')
    t.string('amazon_country')
  })

  const newId = await knex('product_formats')
    .insert({ product_id: 34, numerator: 24, denominator: 1000, unit: 'CS' })
    .returning('id')

  await knex('product_skus').update({ product_id: 31 }).where('product_id', 35)
  await knex('product_skus').update({ product_id: 32 }).where('product_id', 36)
  await knex('product_skus').update({ product_id: 33 }).where('product_id', 37)

  await knex('product_skus').update({ amazon_country: 'CA', format_id: 78 }).where('sku', '100102')
  await knex('product_skus').update({ amazon_country: 'CA', format_id: 54 }).where('sku', '100103')
  await knex('product_skus').update({ asin: 'B0CV3B2KJY', amazon_country: 'US', format_id: 49 }).where('sku', '100111')
  await knex('product_skus').update({ asin: 'B0CV3BJSN4', amazon_country: 'US', format_id: 54 }).where('sku', '100112')
  await knex('product_skus').update({ asin: 'B0CV3LSPJD', amazon_country: 'US', format_id: 59 }).where('sku', '100113')
  await knex('product_skus').update({ asin: 'B0CV3JJ1BK', amazon_country: 'US', format_id: 77 }).where('sku', '100115')
  await knex('product_skus')
    .update({ asin: 'B0CV3JJ1BK', amazon_country: 'US', format_id: 77 })
    .where('sku', '100115-FBM')
  await knex('product_skus').update({ asin: 'B0CJXL78NV', amazon_country: 'CA', format_id: 78 }).where('sku', '100071')
  await knex('product_skus').update({ asin: 'B0CJXMXZXN', amazon_country: 'CA', format_id: 49 }).where('sku', '100072')
  await knex('product_skus').update({ asin: 'B0CJXL2LTH', amazon_country: 'CA', format_id: 54 }).where('sku', '100073')
  await knex('product_skus').update({ asin: 'B0CJXM3JSF', amazon_country: 'CA', format_id: 59 }).where('sku', '100074')

  await knex('product_skus').insert({
    product_id: 31,
    sku: '100122',
    asin: 'B0D5FQ41S7',
    amazon_country: 'US',
    format_id: 47,
    is_active: true,
  })
  await knex('product_skus').insert({
    product_id: 32,
    sku: '100123',
    asin: 'B0D5FVSZFW',
    amazon_country: 'US',
    format_id: 52,
    is_active: true,
  })
  await knex('product_skus').insert({
    product_id: 33,
    sku: '100125',
    asin: 'B0D5FVBNRQ',
    amazon_country: 'US',
    format_id: 57,
    is_active: true,
  })
  await knex('product_skus').insert({
    product_id: 34,
    sku: '100126',
    asin: 'B0D5FN11PG',
    amazon_country: 'US',
    format_id: newId[0].id,
    is_active: true,
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable('amazon_orders_content', (t) => {
    t.dropColumn('asin')
  })

  await knex.schema.alterTable('product_skus', (t) => {
    t.dropColumn('asin')
    t.dropColumn('amazon_country')
    t.boolean('is_amazon')
    t.dropColumn('format_id')
  })

  await knex('product_skus').delete().whereIn('sku', ['100122', '100123', '100125', '100126'])
}
