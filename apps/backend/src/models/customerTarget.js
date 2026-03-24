import Model from './abstract/base'
import path from 'path'

export default class CustomerTarget extends Model {
  static tableName = 'customer_targets'

  static idColumn = ['customer_id', 'period_id']

  static relationMappings = {
    period: {
      relation: Model.HasOneRelation,
      modelClass: path.join(__dirname, 'period'),
      join: {
        from: 'customer_targets.period_id',
        to: 'periods.id',
      },
    },
  }
}
