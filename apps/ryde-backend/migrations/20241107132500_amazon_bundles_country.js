exports.up = async function (knex) {
  await knex.schema.alterTable('amazon_bundles', (t) => {
    t.string('country').default('US')
  })
}

exports.down = async function (knex) {
  await knex.schema.alterTable('amazon_bundles', (t) => {
    t.dropColumn('country')
  })
}
