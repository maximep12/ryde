import Model from './abstract/base'
import path from 'path'

export default class Product extends Model {
  static tableName = 'products'

  static relationMappings = {
    skus: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'productSku'),
      join: {
        from: 'products.id',
        to: 'product_skus.product_id',
      },
    },
    formats: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'productFormat'),
      join: {
        from: 'products.id',
        to: 'product_formats.product_id',
      },
    },
  }
}
