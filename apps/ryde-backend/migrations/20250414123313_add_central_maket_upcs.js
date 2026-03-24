const NEW_UPCS = [
  {
    format_id: 66,
    customer_upc: '81011211000',
    banner: 'Central Market',
  },
  {
    format_id: 70,
    customer_upc: '81011211002',
    banner: 'Central Market',
  },
  {
    format_id: 58,
    customer_upc: '81011211003',
    banner: 'Central Market',
  },
]

/*
100131 - Energize
100133 - Focus
100134 - Relax
*/

exports.up = async (knex) => {
  await knex('customers_upc').insert(NEW_UPCS)

  await knex.raw(`
    UPDATE product_skus set format_id = 66 where sku = '100131';
    UPDATE product_skus set format_id = 70 where sku = '100133';
    UPDATE product_skus set format_id = 58 where sku = '100134';
  `)
}

exports.down = async (knex) => {
  await knex('customers_upc').delete().where('banner', 'Central Market')
  await knex.raw(`
    UPDATE product_skus set format_id = null where sku in('100131','100133','100134');
  `)
}
