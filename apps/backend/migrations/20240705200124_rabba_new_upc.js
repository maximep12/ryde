exports.up = async (knex) => {
  await knex('customers_upc').insert({
    format_id: 54,
    customer_upc: '0062812002005',
    banner: 'RABBA/VARIETY FOOD FAIR',
  })
}

exports.down = async (knex) => {
  await knex('customers_upc').delete().where('customer_upc', '0062812002005')
}
