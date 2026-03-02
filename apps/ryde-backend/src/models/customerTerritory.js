import Model from './abstract/base'

export default class CustomerTerritory extends Model {
  static tableName = 'customer_territories'

  static idColumn = ['territory_id', 'customer_id']
}
