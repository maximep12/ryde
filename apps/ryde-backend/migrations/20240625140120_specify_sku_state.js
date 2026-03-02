exports.up = async (knex) => {
  await knex.schema.alterTable('product_skus', (t) => {
    t.boolean('is_active').defaultTo(true)
    t.boolean('is_amazon').defaultTo(false)
  })

  await knex('product_skus').update({ is_active: false }).where('sku', '100053')
  await knex('product_skus')
    .update({ is_amazon: true })
    .whereIn('sku', ['100102', '100111', '100112', '100113', '100071', '100072', '100073', '100074', '100115-FBM'])
}

exports.down = async (knex) => {
  await knex.schema.alterTable('product_skus', (t) => {
    t.dropColumn('is_active')
    t.dropColumn('is_amazon')
  })
}
