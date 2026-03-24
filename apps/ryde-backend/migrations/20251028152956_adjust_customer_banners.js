exports.up = async function (knex) {
  await knex.raw(`
        WITH banner_mapping AS (
          SELECT banner, mapping FROM (VALUES
              ('7-Eleven', '7-Eleven'),
              ('ATRIUM RESTO', 'ATRIUM RESTO'),
              ('Aisle 24 ', 'Aisle 24 '),
              ('CALGARY CO-OP', 'Calgary Co-Op'),
              ('CANEX', 'Canex'),
              ('CIRCLE K ATL', 'Circle K - Atl'),
              ('CIRCLE K WEST', 'Circle K - West'),
              ('COUCHE TARD', 'Circle K - ON'),
              ('COUCHE TARD QUEBEC', 'Circle K - QC (DC)'),
              ('EXTRA', 'Independents'),
              ('INS MARKETS', 'INS Market'),
              ('Loblaws', 'LCL'),
              ('Ontario Natural Food Company', 'ONFC'),
              ('PARKLAND INDUSTRIES LP', 'Parkland'),
              ('PARKLAND INDUSTRIES LP - PKI EAST', 'Parkland'),
              ('PARKLAND INDUSTRIES LP - PKI West', 'Parkland'),
              ('PETRO CANADA', 'Petro Canada'),
              ('PETRO-CANADA', 'Petro Canada'),
              ('QUICKIE - CODO', 'Quickie'),
              ('RABBA', 'Rabba'),
              ('THE QUICKIE', 'Quickie'),
              ('The Bevy', 'The Bevy'),
              ('WALLACE & CAREY INC. (711)', '7-Eleven (DC)')
          ) AS t(banner, mapping)
      )
      UPDATE customers
      SET banner = banner_mapping.mapping
      FROM banner_mapping
      WHERE customers.banner = banner_mapping.banner;
  `)
}

exports.down = async function (knex) {
  await knex.raw(`
        WITH banner_mapping AS (
          SELECT banner, mapping FROM (VALUES
              ('7-Eleven', '7-Eleven'),
              ('ATRIUM RESTO', 'ATRIUM RESTO'),
              ('Aisle 24 ', 'Aisle 24 '),
              ('CALGARY CO-OP', 'Calgary Co-Op'),
              ('CANEX', 'Canex'),
              ('CIRCLE K ATL', 'Circle K - Atl'),
              ('CIRCLE K WEST', 'Circle K - West'),
              ('COUCHE TARD', 'Circle K - ON'),
              ('COUCHE TARD QUEBEC', 'Circle K - QC (DC)'),
              ('EXTRA', 'Independents'),
              ('INS MARKETS', 'INS Market'),
              ('Loblaws', 'LCL'),
              ('Ontario Natural Food Company', 'ONFC'),
              ('PARKLAND INDUSTRIES LP', 'Parkland'),
              ('PARKLAND INDUSTRIES LP - PKI EAST', 'Parkland'),
              ('PARKLAND INDUSTRIES LP - PKI West', 'Parkland'),
              ('PETRO CANADA', 'Petro Canada'),
              ('PETRO-CANADA', 'Petro Canada'),
              ('QUICKIE - CODO', 'Quickie'),
              ('RABBA', 'Rabba'),
              ('THE QUICKIE', 'Quickie'),
              ('The Bevy', 'The Bevy'),
              ('WALLACE & CAREY INC. (711)', '7-Eleven (DC)')
          ) AS t(banner, mapping)
      )
      UPDATE customers
      SET banner = banner_mapping.banner
      FROM banner_mapping
      WHERE customers.banner = banner_mapping.mapping;
`)
}
