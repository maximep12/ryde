import { customers, productFormats, productSkus, replenOrders, replenOrdersContent } from '@repo/db'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../db'
export {
  createReport,
  getReportsByType,
  linkReportToUploadedFile,
  updateReportFailure,
  updateReportSuccess,
} from '../../lib/reports'

// ─── Customers ───────────────────────────────────────────────────────────────

export async function getCustomerIds(): Promise<number[]> {
  const rows = await db.select({ id: customers.id }).from(customers)
  return rows.map((r) => r.id)
}

// ─── Product skus with format ─────────────────────────────────────────────────

export type ProductSkuWithFormat = {
  sku: string
  format: { id: number; denominator: number | null } | null
}

export async function getProductSkusWithFormats(): Promise<ProductSkuWithFormat[]> {
  const rows = await db
    .select({
      sku: productSkus.sku,
      formatId: productSkus.formatId,
      formatDbId: productFormats.id,
      denominator: productFormats.denominator,
    })
    .from(productSkus)
    .leftJoin(productFormats, eq(productSkus.formatId, productFormats.id))

  return rows.map((r) => ({
    sku: r.sku ?? '',
    format: r.formatDbId != null ? { id: r.formatDbId, denominator: r.denominator ?? null } : null,
  }))
}

// ─── Replen orders with content ───────────────────────────────────────────────

export type ReplenOrderWithContent = typeof replenOrders.$inferSelect & {
  content: (typeof replenOrdersContent.$inferSelect)[]
}

// ─── Replen orders with content ───────────────────────────────────────────────

export async function getReplenOrdersWithContent(billingDocumentIds: number[]): Promise<ReplenOrderWithContent[]> {
  if (billingDocumentIds.length === 0) return []
  const [allOrders, allContent] = await Promise.all([
    db.select().from(replenOrders).where(inArray(replenOrders.billingDocumentId, billingDocumentIds)),
    db.select().from(replenOrdersContent).where(inArray(replenOrdersContent.billingDocumentId, billingDocumentIds)),
  ])

  const contentByBillingDoc = new Map<number, (typeof replenOrdersContent.$inferSelect)[]>()
  for (const c of allContent) {
    const existing = contentByBillingDoc.get(c.billingDocumentId) ?? []
    existing.push(c)
    contentByBillingDoc.set(c.billingDocumentId, existing)
  }

  return allOrders.map((order) => ({
    ...order,
    content: contentByBillingDoc.get(order.billingDocumentId) ?? [],
  }))
}
