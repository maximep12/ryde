const NEW_UPCS = [
  {
    format_id: 58,
    customer_upc: '111045',
    banner: 'Circle K',
  },
  {
    format_id: 66,
    customer_upc: '111043',
    banner: 'Circle K',
  },
  {
    format_id: 70,
    customer_upc: '111044',
    banner: 'Circle K',
  },
]
exports.up = async (knex) => {
  await knex('customers_upc').insert(NEW_UPCS)
}

exports.down = async (knex) => {
  await knex('customers_upc').delete().where('banner', 'Circle K')
}
