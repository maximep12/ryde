import Model from './abstract/base'
import path from 'path'

export default class Region extends Model {
  static tableName = 'regions'

  static relationMappings = {
    districts: {
      relation: Model.ManyToManyRelation,
      modelClass: path.join(__dirname, 'district'),
      join: {
        from: 'regions.id',
        through: {
          from: 'district_regions.region_id',
          to: 'district_regions.district_id',
        },
        to: 'districts.id',
      },
    },
  }
}
