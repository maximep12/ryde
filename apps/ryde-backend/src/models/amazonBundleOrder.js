import Model from './abstract/base'
import path from 'path'

export default class AmazonBundleOrder extends Model {
  static tableName = 'amazon_bundles_orders'

  static idColumn = ['date', 'asin']

  static relationMappings = {
    bundle: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'amazonBundle'),
      join: {
        from: 'amazon_bundles_orders.asin',
        to: 'amazon_bundles.asin',
      },
    },
  }
}
