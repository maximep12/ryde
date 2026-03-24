exports.up = async (knex) => {
  await knex.schema.alterTable('amazon_orders', (t) => {
    t.string('country').default('CA')
  })
  await knex.schema.alterTable('amazon_orders_content', (t) => {
    t.string('currency').default('CA')
  })

  await knex.raw(`
    ALTER TABLE product_formats DROP CONSTRAINT IF EXISTS product_formats_product_sku_foreign;
    ALTER TABLE amazon_orders_content DROP CONSTRAINT IF EXISTS amazon_orders_content_sku_foreign;
    ALTER TABLE orders_content DROP CONSTRAINT IF EXISTS orders_content_sku_foreign;
    ALTER TABLE replen_orders_confirmed DROP CONSTRAINT IF EXISTS replen_orders_confirmed_sku_foreign;
    ALTER TABLE replen_orders_content DROP CONSTRAINT IF EXISTS replen_orders_content_sku_foreign;
  `)

  await knex.schema.raw(`
    ALTER TABLE product_skus ALTER COLUMN sku TYPE varchar;
    ALTER TABLE product_formats ALTER COLUMN product_sku TYPE varchar;
    ALTER TABLE amazon_orders_content ALTER COLUMN sku TYPE varchar;
    ALTER TABLE orders_content ALTER COLUMN sku TYPE varchar;
    ALTER TABLE replen_orders_content ALTER COLUMN sku TYPE varchar;
    ALTER TABLE replen_orders_confirmed ALTER COLUMN sku TYPE varchar;
  `)

  await knex.schema.raw(`
    ALTER TABLE product_formats ADD CONSTRAINT product_formats_product_sku_foreign FOREIGN KEY(product_sku) REFERENCES product_skus(sku);
    ALTER TABLE amazon_orders_content ADD CONSTRAINT amazon_orders_content_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus(sku);
    ALTER TABLE orders_content ADD CONSTRAINT orders_content_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus (sku);
    ALTER TABLE replen_orders_confirmed ADD CONSTRAINT replen_orders_confirmed_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus (sku);
    ALTER TABLE replen_orders_content ADD CONSTRAINT replen_orders_content_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus (sku);
  `)

  await knex('product_skus').insert([
    { product_id: 34, sku: '100115-FBM' },
    { product_id: 35, sku: '100111' },
    { product_id: 36, sku: '100112' },
    { product_id: 37, sku: '100113' },
  ])
}

exports.down = async (knex) => {
  await knex.schema.alterTable('amazon_orders', (t) => {
    t.dropColumn('country')
  })

  await knex.schema.alterTable('amazon_orders_content', (t) => {
    t.dropColumn('currency')
  })

  await knex('product_skus').delete().whereIn('sku', ['100115-FBM', '100111', '100112', '100113'])

  await knex.raw(`
    ALTER TABLE product_formats DROP CONSTRAINT IF EXISTS product_formats_product_sku_foreign;
    ALTER TABLE amazon_orders_content DROP CONSTRAINT IF EXISTS amazon_orders_content_sku_foreign;
    ALTER TABLE orders_content DROP CONSTRAINT IF EXISTS orders_content_sku_foreign;
    ALTER TABLE replen_orders_confirmed DROP CONSTRAINT IF EXISTS replen_orders_confirmed_sku_foreign;
    ALTER TABLE replen_orders_content DROP CONSTRAINT IF EXISTS replen_orders_content_sku_foreign;
`)

  await knex.schema.raw(`
    ALTER TABLE product_skus ALTER COLUMN sku TYPE integer USING (sku::integer);
    ALTER TABLE product_formats ALTER COLUMN product_sku TYPE integer USING (product_sku::integer);
    ALTER TABLE amazon_orders_content ALTER COLUMN sku TYPE integer USING (sku::integer);
    ALTER TABLE orders_content ALTER COLUMN sku TYPE integer USING (sku::integer);
    ALTER TABLE replen_orders_content ALTER COLUMN sku TYPE integer USING (sku::integer);
    ALTER TABLE replen_orders_confirmed ALTER COLUMN sku TYPE integer USING (sku::integer);
`)

  await knex.schema.raw(`
    ALTER TABLE product_formats ADD CONSTRAINT product_formats_product_sku_foreign FOREIGN KEY(product_sku) REFERENCES product_skus(sku);
    ALTER TABLE amazon_orders_content ADD CONSTRAINT amazon_orders_content_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus(sku);
    ALTER TABLE orders_content ADD CONSTRAINT orders_content_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus (sku);
    ALTER TABLE replen_orders_confirmed ADD CONSTRAINT replen_orders_confirmed_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus (sku);
    ALTER TABLE replen_orders_content ADD CONSTRAINT replen_orders_content_sku_foreign FOREIGN KEY(sku) REFERENCES product_skus (sku);
`)
}
