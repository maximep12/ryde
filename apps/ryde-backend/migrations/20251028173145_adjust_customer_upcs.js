exports.up = async function (knex) {
  await knex.raw(`
        WITH banner_mapping AS (
          SELECT banner, mapping FROM (VALUES
              ('Loblaws', 'LCL'),
              ('RABBA', 'Rabba')
          ) AS t(banner, mapping)
      )
      UPDATE customers_upc
      SET banner = banner_mapping.mapping
      FROM banner_mapping
      WHERE customers_upc.banner = banner_mapping.banner;
  `)

  await knex.raw(`
      WITH banner_mapping AS (
        SELECT banner, mapping FROM (VALUES
            ('Loblaws', 'LCL'),
            ('RABBA', 'Rabba')
        ) AS t(banner, mapping)
    )
    UPDATE data_imports
    SET file_origin = banner_mapping.mapping
    FROM banner_mapping
    WHERE data_imports.file_origin = banner_mapping.banner;
  `)
}

exports.down = async function (knex) {
  await knex.raw(`
        WITH banner_mapping AS (
          SELECT banner, mapping FROM (VALUES
              ('Loblaws', 'LCL'),
              ('RABBA', 'Rabba'),
              ('PARKLAND INDUSTRIES LP', 'Parkland')
          ) AS t(banner, mapping)
      )
      UPDATE customers_upc
      SET banner = banner_mapping.banner
      FROM banner_mapping
      WHERE customers_upc.banner = banner_mapping.mapping;
`)

  await knex.raw(`
      WITH banner_mapping AS (
        SELECT banner, mapping FROM (VALUES
            ('Loblaws', 'LCL'),
            ('RABBA', 'Rabba'),
            ('PARKLAND INDUSTRIES LP', 'Parkland')
        ) AS t(banner, mapping)
    )
    UPDATE data_imports
    SET file_origin = banner_mapping.banner
    FROM banner_mapping
    WHERE data_imports.file_origin = banner_mapping.mapping;
`)
}
