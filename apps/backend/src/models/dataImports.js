import Model from './abstract/base'
import path from 'path'

export default class DataImport extends Model {
  static tableName = 'data_imports'

  static relationMappings = {
    competitorSales: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'competitorSale'),
      join: {
        from: 'data_imports.id',
        to: 'competitor_sales.file_import',
      },
    },
  }
}
