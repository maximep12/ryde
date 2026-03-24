import Model from './abstract/base'
import path from 'path'

export default class ProductFormat extends Model {
  static tableName = 'product_formats'

  static relationMappings = {
    product: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'product'),
      join: {
        from: 'product_formats.product_id',
        to: 'products.id',
      },
    },
    skus: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'productSku'),
      join: {
        from: 'product_formats.id',
        to: 'product_skus.format_id',
      },
    },
  }
}
