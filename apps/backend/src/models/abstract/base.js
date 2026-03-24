import Model from 'db'
import _ from 'lodash'

export default class Base extends Model {
  get secureFields() {
    return []
  }

  $beforeInsert() {
    const date = new Date().toISOString()
    this.createdAt = date
    this.updatedAt = date
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString()
  }

  // This is called when an object is serialized to database format.
  $formatDatabaseJson(json) {
    json = super.$formatDatabaseJson(json)

    return _.mapKeys(json, (value, key) => {
      return _.snakeCase(key)
    })
  }

  // This is called when an object is read from database.
  $parseDatabaseJson(json) {
    json = _.mapKeys(json, (value, key) => {
      return _.camelCase(key)
    })

    return super.$parseDatabaseJson(json)
  }

  $formatJson(json, options) {
    json = super.$formatJson(json)

    return _.omit(json, this.secureFields)
  }
}
