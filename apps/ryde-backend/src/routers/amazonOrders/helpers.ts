import { amazonBundles, amazonBundlesOrders, amazonOrders, amazonOrdersContent, productFormats, productSkus } from '@repo/db'
import { eq, inArray, isNotNull } from 'drizzle-orm'
import camelCase from 'lodash/camelCase.js'
import tail from 'lodash/tail.js'
import toLower from 'lodash/toLower.js'
import upperCase from 'lodash/upperCase.js'
import zipObject from 'lodash/zipObject.js'
import zipState from 'zip-state'
import { db } from '../../db'
import { FileLevelError } from '../../lib/FileParser/excel'
import { ERRORS, US_SHIPSTATES } from '../../utils/constants'
export { createReport, getReportsByType, updateReportFailure, updateReportSuccess } from '../../lib/reports'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AmazonProductSku = {
  sku: string
  asin: string | null
  packSize: number | null
}

export type ParsedOrderContent = {
  sku: string
  asin: string
  quantity: number
  netValue: number
  packSize: number | null
  currency: string
  orderId: string
  rows: number[]
}

export type ParsedOrder = {
  orderId: string
  orderDate: string
  orderStatus: string
  salesChannel: string
  country: string | null
  shipState: string | null
  content: ParsedOrderContent[]
}

export type ExistingAmazonOrder = typeof amazonOrders.$inferSelect & {
  content: (typeof amazonOrdersContent.$inferSelect)[]
}

// ─── DB Queries ───────────────────────────────────────────────────────────────

export async function getAmazonProductSkus(): Promise<AmazonProductSku[]> {
  const rows = await db
    .select({
      sku: productSkus.sku,
      asin: productSkus.asin,
      packSize: productFormats.numerator,
    })
    .from(productSkus)
    .leftJoin(productFormats, eq(productSkus.formatId, productFormats.id))
    .where(isNotNull(productSkus.asin))
  return rows.map((r) => ({ sku: r.sku ?? '', asin: r.asin, packSize: r.packSize }))
}

export async function getExistingAmazonOrdersByIds(orderIds: string[]): Promise<ExistingAmazonOrder[]> {
  if (orderIds.length === 0) return []
  const [orders, contents] = await Promise.all([
    db.select().from(amazonOrders).where(inArray(amazonOrders.orderId, orderIds)),
    db.select().from(amazonOrdersContent).where(inArray(amazonOrdersContent.orderId, orderIds)),
  ])
  const contentByOrderId = new Map<string, (typeof amazonOrdersContent.$inferSelect)[]>()
  for (const c of contents) {
    const existing = contentByOrderId.get(c.orderId) ?? []
    existing.push(c)
    contentByOrderId.set(c.orderId, existing)
  }
  return orders.map((order) => ({ ...order, content: contentByOrderId.get(order.orderId) ?? [] }))
}

export async function getAmazonBundles() {
  return db.select().from(amazonBundles)
}

export async function getExistingBundleOrders() {
  return db.select().from(amazonBundlesOrders)
}

// ─── TSV / CSV Parsing ────────────────────────────────────────────────────────

export function tsvToJson({
  fileContent,
  expected = [],
  delimiter = '\t',
}: {
  fileContent: string
  expected?: string[]
  delimiter?: string
}): Record<string, unknown>[] {
  if (!fileContent) throw new FileLevelError(ERRORS.emptyFile())
  const lines = fileContent.split('\n')
  const headers = (lines[0] ?? '').split(delimiter)
  if (expected.length) {
    const missing = expected.filter((col) => !headers.find((h) => h.includes(col)))
    if (missing.length) throw new FileLevelError(ERRORS.missingColumn(missing.map((m) => `"${m}"`).join(', ')))
  }
  const header = headers.map((h) => camelCase(h))
  return tail(lines).map((row, index) => ({ rowNumber: index + 2, ...zipObject(header, row.split(delimiter)) }))
}

export function csvToJson({
  content,
  expectedColumns,
  separator = '\n',
}: {
  content: string
  expectedColumns: string[]
  separator?: string
}): Record<string, unknown>[] {
  const rows = content.split(separator).filter((row) => row.trim() !== '')
  const headers = (rows[0] ?? '').split(',').map((h) => h.trim())
  if (expectedColumns.length) {
    const missing = expectedColumns.filter((col) => !headers.find((h) => h.includes(col)))
    if (missing.length) throw new FileLevelError(ERRORS.missingColumn(missing.map((m) => `"${m}"`).join(', ')))
  }
  return rows.slice(1).map((row) => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < row.length; i++) {
      const ch = row[i] ?? ''
      const next: string | undefined = row[i + 1]
      if (ch === '"' && !inQuotes) {
        inQuotes = true
      } else if (ch === '"' && inQuotes && next === ',') {
        inQuotes = false
        fields.push(current)
        current = ''
        i++
      } else if (ch === '"' && inQuotes && next === '"') {
        current += '"'
        i++
      } else if (ch === '"' && inQuotes) {
        inQuotes = false
      } else if (ch === ',' && !inQuotes) {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current)
    return headers.reduce<Record<string, unknown>>(
      (obj, header, idx) => ({ ...obj, [camelCase(header ?? '')]: fields[idx] ?? '' }),
      {},
    )
  })
}

// ─── Location Resolution ──────────────────────────────────────────────────────

function getCAShipState(zipCode: string): string | null {
  const first = toLower(zipCode?.charAt(0))
  const map: Record<string, string> = {
    a: 'NL', b: 'NS', c: 'PE', e: 'NB',
    g: 'QC', h: 'QC', j: 'QC',
    k: 'ON', l: 'ON', m: 'ON', n: 'ON', p: 'ON',
    r: 'MB', s: 'SK', t: 'AB', v: 'BC', x: 'NT', y: 'YT',
  }
  return map[first] ?? null
}

export async function getProvinceByZipCode({
  amazonOrderId,
  zipCode,
  province,
  country,
}: {
  amazonOrderId: string
  zipCode: string
  province: string
  country: string
}): Promise<{ shipState: string; country: string } | null> {
  const zipCodeEmpty = zipCode === ''
  const provinceEmpty = province === ''
  const countryEmpty = country === ''

  if (zipCodeEmpty && provinceEmpty && countryEmpty) {
    if (amazonOrderId) {
      const [existing] = await db
        .select({ shipState: amazonOrders.shipState, country: amazonOrders.country })
        .from(amazonOrders)
        .where(eq(amazonOrders.orderId, amazonOrderId))
        .limit(1)
      return existing?.shipState && existing?.country
        ? { shipState: existing.shipState, country: existing.country }
        : null
    }
    return null
  }

  if (!provinceEmpty && countryEmpty) {
    const [existing] = await db
      .select({ shipState: amazonOrders.shipState, country: amazonOrders.country })
      .from(amazonOrders)
      .where(eq(amazonOrders.shipState, upperCase(province)))
      .limit(1)
    return existing?.shipState && existing?.country
      ? { shipState: existing.shipState, country: existing.country }
      : null
  }

  if (country === 'CA') {
    const state = getCAShipState(zipCode) ?? (province ? upperCase(province) : null)
    return state ? { shipState: state, country: 'CA' } : null
  }

  if (country === 'US') {
    const byZip = zipState(zipCode)
    if (byZip) return { shipState: byZip, country: 'US' }
    const byName = US_SHIPSTATES[province.toLowerCase() as keyof typeof US_SHIPSTATES]
    const shipState = byName ?? (province ? upperCase(province) : null)
    return shipState ? { shipState, country: 'US' } : null
  }

  return province ? { shipState: upperCase(province), country } : null
}

// ─── Order Building ───────────────────────────────────────────────────────────

export async function buildOrdersFromGroup(
  data: Record<string, unknown>[],
  products: AmazonProductSku[],
): Promise<ParsedOrder[]> {
  const productMap = new Map(products.map((p) => [`${p.sku}|${p.asin}`, p]))

  const grouped = new Map<string, Record<string, unknown>[]>()
  for (const row of data) {
    const orderId = String(row.amazonOrderId ?? '')
    const existing = grouped.get(orderId) ?? []
    existing.push(row)
    grouped.set(orderId, existing)
  }

  return Promise.all(
    Array.from(grouped.values()).map(async (rows) => {
      const first = (rows[0] ?? {}) as Record<string, unknown>
      const purchaseDate = String(first['purchaseDate'] ?? '')
      const amazonOrderId = String(first['amazonOrderId'] ?? '')
      const shipState = String(first['shipState'] ?? '')
      const orderStatus = String(first['orderStatus'] ?? '')
      const shipPostalCode = String(first['shipPostalCode'] ?? '')
      const shipCountry = String(first['shipCountry'] ?? '')
      const salesChannel = String(first['salesChannel'] ?? '')

      const orderLocation = await getProvinceByZipCode({
        amazonOrderId,
        zipCode: shipPostalCode,
        province: shipState,
        country: shipCountry,
      })

      const contentByAsin = new Map<string, ParsedOrderContent>()
      for (const row of rows) {
        const { asin, sku, quantity, currency, itemPrice, rowNumber } = row as Record<string, unknown>
        const asinStr = String(asin ?? '')
        const skuStr = String(sku ?? '')
        const price = itemPrice === '' ? 0 : Number(itemPrice ?? 0)
        const qty = Number(quantity ?? 0)

        const existing = contentByAsin.get(asinStr)
        if (existing) {
          existing.quantity += qty
          existing.netValue += price
          existing.rows.push(Number(rowNumber))
        } else {
          contentByAsin.set(asinStr, {
            sku: skuStr,
            asin: asinStr,
            quantity: qty,
            netValue: price,
            packSize: productMap.get(`${skuStr}|${asinStr}`)?.packSize ?? null,
            currency: String(currency ?? ''),
            orderId: amazonOrderId,
            rows: [Number(rowNumber)],
          })
        }
      }

      return {
        orderId: amazonOrderId,
        orderDate: new Date(purchaseDate).toISOString(),
        orderStatus,
        salesChannel,
        country: orderLocation?.country ?? null,
        shipState: orderLocation?.shipState ?? null,
        content: Array.from(contentByAsin.values()),
      }
    }),
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateRawRows(rows: Record<string, string | number | null>[]): {
  validRows: Record<string, string | number | null>[]
  rejectedRows: string[]
} {
  const validRows: Record<string, string | number | null>[] = []
  const rejectedRows: string[] = []

  for (const row of rows) {
    const { rowNumber, amazonOrderId, sku, quantity, purchaseDate } = row
    const rowNum = String(rowNumber ?? '?')

    if (!amazonOrderId) {
      rejectedRows.push(ERRORS.custom(rowNum, 'Missing Amazon order ID'))
      continue
    }

    if (!sku) {
      rejectedRows.push(ERRORS.custom(rowNum, 'Missing SKU'))
      continue
    }

    if (quantity === null || isNaN(Number(quantity))) {
      rejectedRows.push(ERRORS.invalidQuantity(rowNum, quantity))
      continue
    }

    if (!purchaseDate || isNaN(new Date(String(purchaseDate)).getTime())) {
      rejectedRows.push(ERRORS.custom(rowNum, 'Missing or invalid purchase date'))
      continue
    }

    validRows.push(row)
  }

  return { validRows, rejectedRows }
}

export function validateRows(
  orders: ParsedOrder[],
  products: AmazonProductSku[],
): { validOrders: ParsedOrder[]; rejectedRows: string[] } {
  const validOrders: ParsedOrder[] = []
  const rejectedRows: string[] = []

  for (const order of orders) {
    const allRowNums = order.content.flatMap((c) => c.rows).join(',')

    if (!['Amazon.com', 'Amazon.ca'].includes(order.salesChannel)) {
      rejectedRows.push(ERRORS.invalidAmazonOrigin(allRowNums, ['Amazon.com', 'Amazon.ca'], order.salesChannel))
      continue
    }

    if (!order.country || !order.shipState) {
      rejectedRows.push(
        ERRORS.custom(allRowNums, `Could not assign a postal code to a province. Tell Volume7 immediately.`),
      )
      continue
    }

    const validContent: ParsedOrderContent[] = []
    for (const rowItem of order.content) {
      const rowsIndex = rowItem.rows.join(',')
      const cleanedSku = rowItem.sku.replace(/^-+|-+$/g, '')

      if (rowItem.netValue === 0 && order.orderStatus !== 'Cancelled') {
        rejectedRows.push(
          ERRORS.custom(rowsIndex, `Item price is = 0 and status is not Cancelled (${order.orderStatus})`),
        )
        continue
      }

      if (!rowItem.packSize) {
        const linkedProduct = products.find((p) => p.sku === cleanedSku && p.asin === rowItem.asin)
        if (!linkedProduct) {
          rejectedRows.push(ERRORS.invalidSKU(rowsIndex, rowItem.sku))
          continue
        }
        if (!linkedProduct.packSize) {
          rejectedRows.push(
            ERRORS.custom(rowsIndex, `Selected SKU has no pack format linked to it. Tell Volume7 immediately.`),
          )
          continue
        }
      }

      validContent.push({ ...rowItem, sku: cleanedSku })
    }

    validOrders.push({ ...order, content: validContent })
  }

  return { validOrders, rejectedRows }
}

export function validateBundleRows(
  rows: Record<string, unknown>[],
  availableBundles: (typeof amazonBundles.$inferSelect)[],
): {
  validRows: Record<string, unknown>[]
  rejectedRows: string[]
} {
  const validRows: Record<string, unknown>[] = []
  const rejectedRows: string[] = []

  rows.forEach((it, index) => {
    const { bundleAsin, title } = it as Record<string, string>
    const currentRow = index + 2

    const linkedBundle = availableBundles.find((bundle) => bundle.asin === bundleAsin)
    if (!linkedBundle) {
      rejectedRows.push(ERRORS.invalidAmazonBundleAsin(currentRow, bundleAsin))
      return
    }

    const namesAreMatching = linkedBundle.amazonName.toLowerCase() === (title ?? '').toLowerCase()
    if (!namesAreMatching) {
      rejectedRows.push(ERRORS.amazonBundleTitleChanged(currentRow, title, linkedBundle.amazonName))
      return
    }

    validRows.push(it)
  })

  return { validRows, rejectedRows }
}
