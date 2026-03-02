import Model from './abstract/base'
import path from 'path'

export default class ReplenOrderContent extends Model {
  static tableName = 'replen_orders_content'

  static relationMappings = {
    order: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'replenOrder'),
      join: {
        from: 'replen_orders.billing_document_id',
        to: 'orders.billing_document_id',
      },
    },
  }
}
