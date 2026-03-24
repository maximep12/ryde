import Model from './abstract/base'
import path from 'path'

export default class ProductSku extends Model {
  static tableName = 'product_skus'

  static relationMappings = {
    product: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'product'),
      join: {
        from: 'product_skus.product_id',
        to: 'products.id',
      },
    },
    format: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'productFormat'),
      join: {
        from: 'product_skus.format_id',
        to: 'product_formats.id',
      },
    },
  }

  static modifiers = {
    onlyStoresActive: (builder) => builder.whereNull('amazon_country').andWhere({ is_active: true }),
    onlyAmazon: (builder) => builder.whereNotNull('amazon_country'),
  }
}
