import moment from 'moment'

export async function validateAndInsertProducts({ client, tempTable }) {
  // Transfer data from temp to real table
  // Create products
  const createdAt = moment().format()
  const { rowCount: newProducts } = await client.query(
    `
    INSERT INTO products (
      name, 
      description, 
      is_wsc,
      created_at
    )
    SELECT 
      name, 
      description, 
      is_wsc,
      '${createdAt}'
    FROM ${tempTable};
    `,
  )

  // Link the skus
  const { rowCount: newSkus } = await client.query(`
  INSERT INTO product_skus (
    product_id, 
    sku
  )
  SELECT 
    product.id, 
    temp.id
  FROM products product
  JOIN ${tempTable} temp ON product.name = temp.name
    AND product.description = temp.description
    AND product.is_wsc = temp.is_wsc
  where product.created_at = '${createdAt}'
  `)

  console.log(`[PRODUCTS] Created ${newProducts} products and ${newSkus} skus`)
}

export async function validateAndInsertProductFormats({ client, tempTable }) {
  // Transfer data from temp to real table
  // Create product formats
  const { rowCount: newFormats } = await client.query(
    `
    INSERT INTO product_formats (
      product_sku, 
      numerator,
      denominator,
      unit
    )
    SELECT 
      product_sku, 
      numerator,
      denominator,
      unit
    FROM ${tempTable};
    `,
  )

  console.log(`[PRODUCT FORMATS] Created ${newFormats} formats`)
}
