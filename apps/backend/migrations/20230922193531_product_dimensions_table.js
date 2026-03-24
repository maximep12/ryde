exports.up = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE "product_skus"
    DROP CONSTRAINT IF EXISTS "unique_sku_check",
    ADD CONSTRAINT "unique_sku_check" 
    UNIQUE(sku)
  `)

  await knex.schema.createTable('product_formats', (t) => {
    t.increments('id').primary()
    t.integer('product_sku').references('product_skus.sku')
    t.integer('numerator')
    t.integer('denominator')
    t.string('unit')

    t.timestamps(false, true)
  })
}

exports.down = async function (knex) {
  await knex.schema.dropTable('product_formats')
  await knex.schema.raw(`
  ALTER TABLE "product_skus"
  DROP CONSTRAINT IF EXISTS "unique_sku_check"
`)
}
