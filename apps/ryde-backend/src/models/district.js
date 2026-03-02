import Model from './abstract/base'
import path from 'path'

export default class District extends Model {
  static tableName = 'districts'

  static relationMappings = {
    territories: {
      relation: Model.ManyToManyRelation,
      modelClass: path.join(__dirname, 'territory'),
      join: {
        from: 'districts.id',
        through: {
          from: 'territory_districts.district_id',
          to: 'territory_districts.territory_id',
        },
        to: 'territories.id',
      },
    },
    regions: {
      relation: Model.ManyToManyRelation,
      modelClass: path.join(__dirname, 'region'),
      join: {
        from: 'districts.id',
        through: {
          from: 'district_regions.district_id',
          to: 'district_regions.region_id',
        },
        to: 'regions.id',
      },
    },
  }
}
