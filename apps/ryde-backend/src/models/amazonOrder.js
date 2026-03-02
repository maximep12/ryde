import Model from './abstract/base'
import path from 'path'

export default class AmazonOrder extends Model {
  static tableName = 'amazon_orders'

  static idColumn = 'order_id'

  static relationMappings = {
    content: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'amazonOrderContent'),
      join: {
        from: 'amazon_orders.order_id',
        to: 'amazon_orders_content.order_id',
      },
    },
  }
}
