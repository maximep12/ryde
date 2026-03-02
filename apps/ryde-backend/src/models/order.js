import Model from './abstract/base'
import path from 'path'

export default class Order extends Model {
  static tableName = 'orders'

  static relationMappings = {
    customer: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'customer'),
      join: {
        from: 'orders.customer_id',
        to: 'customers.id',
      },
    },
    content: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'orderContent'),
      join: {
        from: 'orders.id',
        to: 'orders_content.billing_document_id',
      },
    },
    products: {
      relation: Model.ManyToManyRelation,
      modelClass: path.join(__dirname, 'product'),
      join: {
        from: 'orders.id',
        through: {
          from: 'orders_content.order_id',
          to: 'orders_content.product_id',
        },
        to: 'products.id',
      },
    },
  }
}
