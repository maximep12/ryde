import Model from './abstract/base'
import path from 'path'

export default class ReplenOrder extends Model {
  static tableName = 'replen_orders'

  static relationMappings = {
    customer: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'customer'),
      join: {
        from: 'replen_orders.customer_id',
        to: 'customers.id',
      },
    },
    content: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'replenOrderContent'),
      join: {
        from: 'replen_orders.billing_document_id',
        to: 'replen_orders_content.billing_document_id',
      },
    },
  }
}
