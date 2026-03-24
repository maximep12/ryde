import Model from './abstract/base'

export default class DistrictRegion extends Model {
  static tableName = 'district_regions'

  static idColumn = ['region_id', 'district_id']
}
