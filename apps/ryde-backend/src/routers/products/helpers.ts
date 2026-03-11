import { productFormats, products, productSkus } from '@repo/db'
import { inArray } from 'drizzle-orm'
import { db } from '../../db'
export { createReport, getReportsByType, updateReportFailure, updateReportSuccess } from '../../lib/reports'

// ─── Products ────────────────────────────────────────────────────────────────

export async function getAllProductSkus() {
  return db.select().from(productSkus)
}

export type ProductRow = {
  sku: string
  name: string
  description: string
  upc: string | null
  isWsc: boolean
}

export async function bulkUpsertProducts(
  rows: ProductRow[],
): Promise<{ created: number; updated: number; identical: number }> {
  if (rows.length === 0) return { created: 0, updated: 0, identical: 0 }

  // Group rows by unique (name, description, isWsc) to avoid duplicates within the batch
  const uniqueProductKeys = new Map<string, { name: string; description: string; isWsc: boolean }>()
  for (const row of rows) {
    const key = `${row.name}|${row.description}|${row.isWsc}`
    if (!uniqueProductKeys.has(key)) {
      uniqueProductKeys.set(key, { name: row.name, description: row.description, isWsc: row.isWsc })
    }
  }

  const productValues = [...uniqueProductKeys.values()]
  await db.insert(products).values(productValues).onConflictDoNothing()

  // Fetch all products that match the inserted ones to get their IDs
  const names = productValues.map((p) => p.name)
  const existingProducts = await db.select().from(products).where(inArray(products.name, names))

  // Build product lookup: key → product.id
  const productIdByKey = new Map<string, number>()
  for (const product of existingProducts) {
    const key = `${product.name}|${product.description}|${product.isWsc}`
    productIdByKey.set(key, product.id)
  }

  // Build product_skus to insert
  const skuValues = rows
    .map((row) => {
      const key = `${row.name}|${row.description}|${row.isWsc}`
      const productId = productIdByKey.get(key)
      if (!productId) return null
      return { productId, sku: row.sku }
    })
    .filter((v): v is { productId: number; sku: string } => v !== null)

  if (skuValues.length === 0) return { created: 0, updated: 0, identical: rows.length }

  const CHUNK_SIZE = 500
  let created = 0
  for (let i = 0; i < skuValues.length; i += CHUNK_SIZE) {
    const result = await db
      .insert(productSkus)
      .values(skuValues.slice(i, i + CHUNK_SIZE))
      .onConflictDoNothing()
      .returning()
    created += result.length
  }

  return { created, updated: 0, identical: rows.length - created }
}

// ─── Product Formats ─────────────────────────────────────────────────────────

export type FormatRow = {
  sku: string
  numerator: number | null
  denominator: number | null
  unit: string | null
  upc: string | null
}

export async function bulkUpsertProductFormats(rows: FormatRow[]) {
  if (rows.length === 0) return []

  // Look up product_skus to get productIds
  const skus = [...new Set(rows.map((r) => r.sku))]
  const existingSkus = await db.select().from(productSkus).where(inArray(productSkus.sku, skus))

  const productIdBySku = new Map<string, number>()
  for (const s of existingSkus) {
    if (s.sku && s.productId) productIdBySku.set(s.sku, s.productId)
  }

  const formatValues = rows
    .map((row) => {
      const productId = productIdBySku.get(row.sku) ?? null
      return {
        productId,
        numerator: row.numerator,
        denominator: row.denominator,
        unit: row.unit,
        upc: row.upc,
      }
    })
    .filter((v) => v.productId !== null)

  if (formatValues.length === 0) return []

  const CHUNK_SIZE = 500
  const created: (typeof formatValues)[0][] = []
  for (let i = 0; i < formatValues.length; i += CHUNK_SIZE) {
    const batch = formatValues.slice(i, i + CHUNK_SIZE)
    const result = await db.insert(productFormats).values(batch).onConflictDoNothing().returning()
    created.push(...(result as typeof formatValues))
  }

  return created
}
