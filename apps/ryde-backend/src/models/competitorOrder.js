import Model from './abstract/base'
import path from 'path'

export default class CompetitorOrder extends Model {
  static tableName = 'competitor_orders'

  static relationMappings = {
    customer: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'dataImports'),
      join: {
        from: 'competitor_orders.customer_id',
        to: 'customers.id',
      },
    },
  }
}
