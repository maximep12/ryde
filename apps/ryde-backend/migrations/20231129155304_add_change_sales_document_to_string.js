exports.up = async (knex) => {
  await knex.raw(`
    ALTER TABLE replen_orders_confirmed ALTER COLUMN sales_document TYPE varchar;
  `)
}

exports.down = async (knex) => {
  await knex.raw(`
  ALTER TABLE replen_orders_confirmed ALTER COLUMN sales_document TYPE integer USING (sales_document::integer);
`)
}
