import Model from './abstract/base'
import path from 'path'

export default class AmazonOrderContent extends Model {
  static tableName = 'amazon_orders_content'

  static relationMappings = {
    order: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'amazonOrder'),
      join: {
        from: 'amazon_orders_content.sku',
        to: 'amazonOrder.order_id',
      },
    },
    product: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'product'),
      join: {
        from: 'amazon_orders_content.sku',
        through: {
          from: 'product_skus.sku',
          to: 'product_skus.product_id',
        },
        to: 'products.id',
      },
    },
  }
}
