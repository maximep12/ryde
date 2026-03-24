const NEW_UPCS = [
  {
    format_id: 66,
    customer_upc: '628120020007',
    banner: 'Petro Canada',
  },
  {
    format_id: 70,
    customer_upc: '628120020052',
    banner: 'Petro Canada',
  },
  {
    format_id: 58,
    customer_upc: '628120020076',
    banner: 'Petro Canada',
  },
]
exports.up = async (knex) => {
  await knex('customers_upc').insert(NEW_UPCS)
}

exports.down = async (knex) => {
  await knex('customers_upc').delete().where('banner', 'Petro Canada')
}
