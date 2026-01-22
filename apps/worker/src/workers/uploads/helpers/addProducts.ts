import { productsSchema } from '@repo/csv'
import { products } from '@repo/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db'

type AddProductsRecord = z.infer<typeof productsSchema>

export type AddProductsValidationDetails = {
  productCode: string
  isExisting: boolean
}

export async function validateAddProductsRecord(
  record: AddProductsRecord,
): Promise<{ isValid: boolean; details: AddProductsValidationDetails }> {
  const productCode = String(record.product_code)

  // Check if product already exists
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(eq(products.productCode, productCode))
    .limit(1)

  const details: AddProductsValidationDetails = {
    productCode,
    isExisting: !!existingProduct,
  }

  // Product is valid if it doesn't already exist
  const isValid = !details.isExisting

  return {
    isValid,
    details,
  }
}

export async function processAddProductsRecord(
  record: AddProductsRecord,
): Promise<AddProductsRecord> {
  await db.insert(products).values({
    productCode: String(record.product_code),
    description: String(record.description),
    productType: String(record.product_type),
  })

  return record
}
