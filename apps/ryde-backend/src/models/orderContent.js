import Model from './abstract/base'
import path from 'path'

export default class OrderContent extends Model {
  static tableName = 'orders_content'

  static relationMappings = {
    order: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'order'),
      join: {
        from: 'orders_content.order_id',
        to: 'orders.id',
      },
    },
    product: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'product'),
      join: {
        from: 'orders_content.sku',
        through: {
          from: 'product_skus.sku',
          to: 'product_skus.product_id',
        },
        to: 'products.id',
      },
    },
  }
}
