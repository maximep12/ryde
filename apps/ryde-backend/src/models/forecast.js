import Model from './abstract/base'
import path from 'path'

export default class Forecast extends Model {
  static tableName = 'forecasts'

  static relationMappings = {
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
