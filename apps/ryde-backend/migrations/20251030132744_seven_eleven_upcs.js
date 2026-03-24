const NEW_UPCS = [
  {
    format_id: 58,
    customer_upc: '221782',
    banner: '7-Eleven',
  },
  {
    format_id: 66,
    customer_upc: '221980',
    banner: '7-Eleven',
  },
  {
    format_id: 70,
    customer_upc: '221978',
    banner: '7-Eleven',
  },
]
exports.up = async (knex) => {
  await knex('customers_upc').insert(NEW_UPCS)
}

exports.down = async (knex) => {
  await knex('customers_upc').delete().where('banner', '7-Eleven')
}
