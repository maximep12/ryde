import Model from './abstract/base'

export default class TerritoryDistrict extends Model {
  static tableName = 'territory_districts'

  static idColumn = ['territory_id', 'district_id']
}
