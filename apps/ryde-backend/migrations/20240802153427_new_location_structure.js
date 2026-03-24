exports.up = async function (knex) {
  await knex.schema.alterTable('customers', (t) => {
    t.string('country')
    t.string('state')
    t.string('area')
    t.string('sub_channel')
    t.string('territory')
    t.string('phase')
  })
}

exports.down = async function (knex) {
  await knex.schema.alterTable('customers', (t) => {
    t.dropColumn('country')
    t.dropColumn('state')
    t.dropColumn('area')
    t.dropColumn('sub_channel')
    t.dropColumn('territory')
    t.dropColumn('phase')
  })
}
