import { customers, customersUpc, productFormats, productSkus, replenOrdersConfirmed } from '@repo/db'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../db'
export { createReport, getReportsByType, updateReportFailure, updateReportSuccess } from '../../lib/reports'

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomersByBanner(banner: string) {
  return db.select().from(customers).where(eq(customers.banner, banner))
}

export async function getAllCustomerIds(): Promise<number[]> {
  const rows = await db.select({ id: customers.id }).from(customers)
  return rows.map((r) => r.id)
}

// ─── Product skus with format ─────────────────────────────────────────────────

export type ProductSkuWithFormat = {
  sku: string
  format: { id: number; numerator: number | null; unit: string | null } | null
}

export async function getProductSkusWithFormats(): Promise<ProductSkuWithFormat[]> {
  const rows = await db
    .select({
      sku: productSkus.sku,
      formatDbId: productFormats.id,
      numerator: productFormats.numerator,
      unit: productFormats.unit,
    })
    .from(productSkus)
    .leftJoin(productFormats, eq(productSkus.formatId, productFormats.id))

  return rows.map((r) => ({
    sku: r.sku ?? '',
    format: r.formatDbId != null ? { id: r.formatDbId, numerator: r.numerator ?? null, unit: r.unit ?? null } : null,
  }))
}

// ─── Existing confirmed orders ────────────────────────────────────────────────

export async function getExistingConfirmedOrders(customerIdList: number[]) {
  if (customerIdList.length === 0) return []
  return db
    .select({
      id: replenOrdersConfirmed.id,
      salesDocument: replenOrdersConfirmed.salesDocument,
      customerId: replenOrdersConfirmed.customerId,
      sku: replenOrdersConfirmed.sku,
      confirmedQuantity: replenOrdersConfirmed.confirmedQuantity,
      netValue: replenOrdersConfirmed.netValue,
    })
    .from(replenOrdersConfirmed)
    .where(inArray(replenOrdersConfirmed.customerId, customerIdList))
}

export async function getExistingConfirmedOrdersByCustomersAndDate(customerIdList: number[], documentDate: string) {
  if (customerIdList.length === 0) return []
  return db
    .select()
    .from(replenOrdersConfirmed)
    .where(
      and(
        inArray(replenOrdersConfirmed.customerId, customerIdList),
        eq(replenOrdersConfirmed.documentDate, documentDate),
      ),
    )
}

// ─── 7-Eleven UPC products ────────────────────────────────────────────────────

export type UpcProduct = {
  sku: string
  packSize: number
  unit: string | null
}

export async function getSevenElevenUpcProducts(banner: string, skusToUse: string[]): Promise<Map<string, UpcProduct>> {
  const rows = await db
    .select({
      customerUpc: customersUpc.customerUpc,
      numerator: productFormats.numerator,
      unit: productFormats.unit,
      sku: productSkus.sku,
    })
    .from(customersUpc)
    .innerJoin(productFormats, eq(customersUpc.formatId, productFormats.id))
    .innerJoin(productSkus, eq(productFormats.id, productSkus.formatId))
    .where(eq(customersUpc.banner, banner))

  const result = new Map<string, UpcProduct>()
  for (const row of rows) {
    if (!row.sku || !skusToUse.includes(row.sku)) continue
    if (result.has(row.customerUpc)) continue // first match wins
    result.set(row.customerUpc, {
      sku: row.sku,
      packSize: row.numerator ?? 0,
      unit: row.unit ?? null,
    })
  }
  return result
}
