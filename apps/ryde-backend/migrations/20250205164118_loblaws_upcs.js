const NEW_UPCS = [
  {
    format_id: 81,
    customer_upc: '62812002017',
    banner: 'Loblaws',
  },
  {
    format_id: 80,
    customer_upc: '62812002016',
    banner: 'Loblaws',
  },
  {
    format_id: 82,
    customer_upc: '62812002015',
    banner: 'Loblaws',
  },
]
exports.up = async (knex) => {
  await knex('customers_upc').insert(NEW_UPCS)
}

exports.down = async (knex) => {
  await knex('customers_upc').delete().where('banner', 'Loblaws')
}
