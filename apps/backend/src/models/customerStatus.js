import Model from './abstract/base'
import path from 'path'

export default class CustomerProductStatus extends Model {
  static tableName = 'customer_product_status'

  static idColumn = ['customer_id', 'status_date']

  static relationMappings = {
    customer: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'customer'),
      join: {
        from: 'customer_product_status.customer_id',
        to: 'customers.id',
      },
    },
  }
}
