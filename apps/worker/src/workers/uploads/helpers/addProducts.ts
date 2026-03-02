import { productsSchema } from '@repo/csv'
import { products } from '@repo/db'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../../db'
import { BatchValidationResult, NodePgTransaction } from '../types'

type AddProductsRecord = z.infer<typeof productsSchema>

export type AddProductsValidationDetails = {
  productCode: string
  isUpdate: boolean
}

export async function validateAddProductsRecord(
  record: AddProductsRecord,
): Promise<{ isValid: boolean; details: AddProductsValidationDetails }> {
  const productCode = String(record.product_code)

  // Check if product already exists
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(eq(products.name, productCode))
    .limit(1)

  const details: AddProductsValidationDetails = {
    productCode,
    isUpdate: !!existingProduct,
  }

  // All products are valid (upsert will handle insert or update)
  return {
    isValid: true,
    details,
  }
}

export async function processAddProductsRecord(
  record: AddProductsRecord,
): Promise<AddProductsRecord> {
  await db.insert(products).values({
    name: String(record.product_code),
    description: String(record.description),
  })

  return record
}

// Batch validation - single IN query for all records
export async function batchValidateProducts(
  records: Array<{ record: AddProductsRecord; rowIndex: number }>,
): Promise<Array<BatchValidationResult<AddProductsValidationDetails>>> {
  if (records.length === 0) return []

  // Extract all product codes
  const codes = records.map((r) => String(r.record.product_code))

  // Single query to find all existing products by name
  const existingProducts = await db
    .select({ name: products.name })
    .from(products)
    .where(inArray(products.name, codes))

  // Build Set for O(1) lookup
  const existingNames = new Set(existingProducts.map((p) => p.name))

  // Track seen codes to detect updates (last occurrence wins for duplicates in batch)
  const seenCodes = new Set<string>()

  const results: Array<BatchValidationResult<AddProductsValidationDetails>> = []

  for (const { record, rowIndex } of records) {
    const productCode = String(record.product_code)

    const isExistingInDb = existingNames.has(productCode)
    const isDuplicateInBatch = seenCodes.has(productCode)

    const details: AddProductsValidationDetails = {
      productCode,
      isUpdate: isExistingInDb || isDuplicateInBatch,
    }

    // All products are valid (upsert will handle insert or update)
    results.push({
      rowIndex,
      record,
      isValid: true,
      details,
    })

    // Track this record's code
    seenCodes.add(productCode)
  }

  return results
}

// Batch insert - transaction-aware
export async function batchInsertProducts(
  tx: NodePgTransaction,
  records: AddProductsRecord[],
): Promise<void> {
  if (records.length === 0) return

  const values = records.map((record) => ({
    name: String(record.product_code),
    description: String(record.description),
  }))

  await tx.insert(products).values(values)
}
