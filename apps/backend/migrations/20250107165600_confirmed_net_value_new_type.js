exports.up = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE replen_orders_confirmed
    ALTER COLUMN net_value TYPE numeric(10, 2)
    USING net_value::numeric(10, 2);
    UPDATE product_skus set format_id = 49 where sku = '100051';
    UPDATE product_skus set format_id = 54 where sku = '100101';
    UPDATE product_skus set format_id = 59 where sku = '100054';
  `)
}

exports.down = async function (knex) {
  await knex.schema.raw(`
    ALTER TABLE replen_orders_confirmed
    ALTER COLUMN net_value TYPE real
    USING net_value::real;
    UPDATE product_skus set format_id = NULL where sku in ('100051','100101','100054');
  `)
}
