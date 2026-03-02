exports.up = async function (knex) {
  await knex.schema.raw(`
    WITH inserted_formats AS (
        INSERT INTO product_formats (numerator, denominator, unit, upc, product_id)
        VALUES 
            (4, 1000, 'CAR', 628120020168, 31), -- Energize
            (4, 1000, 'CAR', 628120020175, 32), -- Focus
            (4, 1000, 'CAR', 628120020151, 33)  -- Relax
        RETURNING id, product_id
    )
    INSERT INTO product_skus (product_id, sku, format_id)
    SELECT
        inserted_formats.product_id,
        CASE inserted_formats.product_id
            WHEN 31 THEN '100161' -- Energize
            WHEN 32 THEN '100164' -- Focus
            WHEN 33 THEN '100165' -- Relax
        END AS sku,
        inserted_formats.id AS format_id
    FROM inserted_formats;
  `)
}

exports.down = async function (knex) {
  await knex.schema.raw(`
  DELETE FROM product_skus where sku in ('100161', '100164', '100165');
  DELETE FROM product_formats where upc in ('628120020168', '628120020175', '628120020151')
`)
}
