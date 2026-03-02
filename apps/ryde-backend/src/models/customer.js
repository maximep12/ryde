import Model from './abstract/base'
import path from 'path'

export default class Customer extends Model {
  static tableName = 'customers'

  static relationMappings = {
    territories: {
      relation: Model.ManyToManyRelation,
      modelClass: path.join(__dirname, 'territory'),
      join: {
        from: 'customers.id',
        through: {
          from: 'customer_territories.customer_id',
          to: 'customer_territories.territory_id',
        },
        to: 'territories.id',
      },
    },
  }
}
