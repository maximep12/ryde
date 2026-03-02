// 49: Energize
// 54: Focus
// 59: Relax
const NEW_UPCS = [
  {
    format_id: 49,
    customer_upc: '10628120020028',
    banner: '7-Eleven',
  },
  {
    format_id: 54,
    customer_upc: '10628120020042',
    banner: '7-Eleven',
  },
  {
    format_id: 59,
    customer_upc: '10628120020080',
    banner: '7-Eleven',
  },
]
exports.up = async (knex) => {
  await knex('customers_upc').insert(NEW_UPCS)
}

exports.down = async (knex) => {
  await knex('customers_upc')
    .delete()
    .whereIn('customer_upc', ['10628120020028', '10628120020042', '10628120020080'])
    .andWhere('banner', '7-Eleven')
}
