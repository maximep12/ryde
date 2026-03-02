import Model from './abstract/base'
import path from 'path'

export default class CompetitorSale extends Model {
  static tableName = 'competitor_sales'

  static relationMappings = {
    dataImport: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'dataImports'),
      join: {
        from: 'competitor_sales.file_import',
        to: 'data_imports.id',
      },
    },
  }
}
