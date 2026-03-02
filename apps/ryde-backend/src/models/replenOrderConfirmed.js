import Model from './abstract/base'
import path from 'path'

export default class ReplenOrderConfirmed extends Model {
  static tableName = 'replen_orders_confirmed'

  static relationMappings = {
    customer: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'customer'),
      join: {
        from: 'replen_orders_confirmed.customer_id',
        to: 'customers.id',
      },
    },
    product: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'product'),
      join: {
        from: 'replen_orders_confirmed.sku',
        through: {
          from: 'product_skus.sku',
          to: 'product_skus.product_id',
        },
        to: 'products.id',
      },
    },
  }
}
