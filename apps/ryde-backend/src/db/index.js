import config from 'config'
import { Model, QueryBuilder } from 'objection'

const knex = require('knex')(config.database)

Model.knex(knex)

class MyQueryBuilder extends QueryBuilder {
  // Some custom method.
  upsert(model) {
    if (model.id) return this.patch(model).where('id', model.id)

    return this.insert(model)
  }
}

// Instance of this is created when you call `query()` or `$query()`.
Model.QueryBuilder = MyQueryBuilder
// Instance of this is created when you call `$relatedQuery()`.
Model.RelatedQueryBuilder = MyQueryBuilder

export default Model
