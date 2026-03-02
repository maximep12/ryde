import Model from './abstract/base'
import path from 'path'

export default class Territory extends Model {
  static tableName = 'territories'

  static relationMappings = {
    customers: {
      relation: Model.ManyToManyRelation,
      modelClass: path.join(__dirname, 'customer'),
      join: {
        from: 'territories.id',
        through: {
          from: 'customer_territories.territory_id',
          to: 'customer_territories.customer_id',
        },
        to: 'customers.id',
      },
    },
    districts: {
      relation: Model.ManyToManyRelation,
      modelClass: path.join(__dirname, 'district'),
      join: {
        from: 'territories.id',
        through: {
          from: 'territory_districts.territory_id',
          to: 'territory_districts.district_id',
        },
        to: 'districts.id',
      },
    },
  }
}
