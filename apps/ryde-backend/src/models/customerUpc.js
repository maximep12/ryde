import Model from './abstract/base'
import path from 'path'

export default class CustomerUpc extends Model {
  static tableName = 'customers_upc'

  static relationMappings = {
    format: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'productFormat'),
      join: {
        from: 'customers_upc.format_id',
        to: 'product_formats.id',
      },
    },
  }
}
