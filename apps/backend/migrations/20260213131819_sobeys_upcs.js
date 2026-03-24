// 49: Energize
// 54: Focus
// 59: Relax
const NEW_UPCS = [
  {
    format_id: 49,
    customer_upc: '1395873',
    banner: 'Sobeys',
  },
  {
    format_id: 54,
    customer_upc: '1395869',
    banner: 'Sobeys',
  },
  {
    format_id: 59,
    customer_upc: '1395854',
    banner: 'Sobeys',
  },
]
exports.up = async (knex) => {
  await knex('customers_upc').insert(NEW_UPCS)
}

exports.down = async (knex) => {
  await knex('customers_upc')
    .delete()
    .whereIn(
      'customer_upc',
      NEW_UPCS.map((upc) => upc.customer_upc),
    )
    .andWhere('banner', 'Sobeys')
}
