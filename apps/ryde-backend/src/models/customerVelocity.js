import Model from './abstract/base'

export default class CustomerVelocity extends Model {
  static tableName = 'customers_velocity'
}

export async function refreshCustomerVelocity() {
  await CustomerVelocity.knex().schema.refreshMaterializedView('customers_velocity')
}
