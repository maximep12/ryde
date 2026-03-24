import Model from './abstract/base'
import path from 'path'

export default class Period extends Model {
  static tableName = 'periods'

  static relationMappings = {
    targets: {
      relation: Model.HasManyRelation,
      modelClass: path.join(__dirname, 'customerTarget'),
      join: {
        from: 'periods.id',
        to: 'customer_targets.period_id',
      },
    },
  }
}
