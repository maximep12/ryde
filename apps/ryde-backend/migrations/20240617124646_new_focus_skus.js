exports.up = async (knex) => {
  await knex('product_skus').delete().whereIn('sku', ['100103', '100105', '100106'])
  await knex('product_skus').insert([
    { sku: '100101', product_id: 32 },
    { sku: '100102', product_id: 32 },
    { sku: '100103', product_id: 34 },
  ])
}

exports.down = async (knex) => {
  await knex('product_skus').delete().whereIn('sku', ['100101', '100102', '100103'])

  await knex('product_skus').insert([
    { sku: '100103', product_id: 1 },
    { sku: '100105', product_id: 2 },
    { sku: '100106', product_id: 3 },
  ])
}
