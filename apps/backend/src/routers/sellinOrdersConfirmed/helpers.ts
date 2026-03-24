import { customers, customersUpc, productFormats, productSkus, replenOrdersConfirmed } from '@repo/db'
import { and, eq, inArray, like } from 'drizzle-orm'
import { db } from '../../db'
import { ERRORS } from '../../utils/constants.js'
export {
  createReport,
  getReportsByType,
  linkReportToUploadedFile,
  updateReportFailure,
  updateReportSuccess,
} from '../../lib/reports'

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

export async function getExistingConfirmedOrders(salesDocuments: string[]) {
  if (salesDocuments.length === 0) return []
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
    .where(inArray(replenOrdersConfirmed.salesDocument, salesDocuments))
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

// ─── Circle K QC Confirmed ───────────────────────────────────────────────────
// Semicolon-delimited file with columns: INV DATE, STORE, CASE UPC, INVOICE, QTY SHIPPED
// Writes to replenOrdersConfirmed table.

const CIRCLE_K_QC_STORES_BANNER = 'Circle K - QC'
const CIRCLE_K_SEARCH_BANNER = 'Circle K'

async function getCircleKQcCustomers() {
  return db.select().from(customers).where(eq(customers.banner, CIRCLE_K_QC_STORES_BANNER))
}

type CircleKUpcProduct = {
  sku: string
  packSize: number
  unit: string | null
}

async function getCircleKUpcProducts(): Promise<Map<string, CircleKUpcProduct>> {
  const rows = await db
    .select({
      customerUpc: customersUpc.customerUpc,
      sku: customersUpc.sku,
      unit: productFormats.unit,
      numerator: productFormats.numerator,
    })
    .from(customersUpc)
    .innerJoin(productSkus, eq(customersUpc.sku, productSkus.sku))
    .innerJoin(productFormats, eq(productSkus.formatId, productFormats.id))
    .where(like(customersUpc.banner, `%${CIRCLE_K_SEARCH_BANNER}%`))

  const result = new Map<string, CircleKUpcProduct>()
  for (const row of rows) {
    if (!row.sku) continue
    if (result.has(row.customerUpc)) continue
    result.set(row.customerUpc, {
      sku: row.sku,
      packSize: row.numerator ?? 0,
      unit: row.unit ?? null,
    })
  }
  return result
}

export type CircleKQcConfirmedProcessResult = {
  received: number
  ordersCreated: number
  ordersUpdated: number
  createdRows: number
  updatedRows: number
  deletedRows: number
  identicalRows: number
  rejected: string[]
}

/**
 * Parse Circle K QC confirmed semicolon-delimited file.
 * Columns: INV DATE (MM/DD/YY), STORE, PART-NUM, DESCRIPTION, UPC, CASE UPC, RETAIL UPC, INVOICE, QTY SHIPPED, UOM
 */
export async function processCircleKQcConfirmedFile(buffer: Buffer): Promise<CircleKQcConfirmedProcessResult> {
  const fileContent = buffer.toString('utf-8')
  const lines = fileContent.split('\n')

  const strip = (s: string) => s?.replace(/^"(.*)"$/, '$1').trim() ?? ''

  // Parse header
  const headers = (lines[0] ?? '').split(';').map((h) => strip(h).toUpperCase())
  const expectedColumns = ['INV DATE', 'STORE', 'CASE UPC', 'INVOICE', 'QTY SHIPPED']
  const missingCols = expectedColumns.filter((col) => !headers.some((h) => h.includes(col)))
  if (missingCols.length) {
    throw Object.assign(new Error(ERRORS.missingColumn(missingCols.join(', '))), { code: 406 })
  }

  const headerMap = headers.reduce<Record<string, number>>((acc, h, i) => {
    acc[h] = i
    return acc
  }, {})

  // Parse data rows
  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line, index) => {
      const cols = line.split(';')
      const get = (name: string) => strip(cols[headerMap[name] ?? -1] ?? '')
      const invDate = get('INV DATE')
      // Parse MM/DD/YY format
      const [month, day, year] = invDate.split('/')
      const fullYear = Number(year) < 50 ? `20${year}` : `19${year}`
      const date = `${fullYear}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`
      const quantity = parseInt(get('QTY SHIPPED'), 10)
      return {
        rowNumber: index + 2,
        date,
        store: get('STORE'),
        caseUpc: get('CASE UPC'),
        invoice: get('INVOICE'),
        quantity,
        rawInvDate: invDate,
        rawQtyShipped: get('QTY SHIPPED'),
      }
    })

  const totalRowsReceived = rows.length

  const [circleKCustomers, upcProducts] = await Promise.all([getCircleKQcCustomers(), getCircleKUpcProducts()])

  const customerIds = circleKCustomers.map((c) => c.id)
  const customersByBannerInternalId = new Map(circleKCustomers.map((c) => [c.bannerInternalId, c]))

  // Find date range for batch query
  const validDates = rows.map((r) => r.date).filter((d) => !isNaN(new Date(d).getTime()))
  const sortedDates = validDates.sort()
  const minDate = sortedDates[0] ?? ''
  const maxDate = sortedDates.at(-1) ?? ''

  const existingConfirmed =
    customerIds.length && minDate
      ? await db
          .select()
          .from(replenOrdersConfirmed)
          .where(
            and(
              inArray(replenOrdersConfirmed.customerId, customerIds),
              inArray(replenOrdersConfirmed.documentDate, [...new Set(validDates)]),
            ),
          )
      : []

  const existingConfirmedMap = new Map(
    existingConfirmed.map((e) => [`${String(e.salesDocument)}|${e.customerId}|${e.sku}`, e]),
  )

  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0
  const rejectedRows: string[] = []

  const toInsert: {
    sku: string
    confirmedQuantity: number
    netValue: string
    salesDocument: string
    documentDate: string
    status: string
    salesUnit: string | undefined
    customerId: number
    deliveryDate: string
  }[] = []
  const toUpdate: { id: number; confirmedQuantity: number }[] = []

  for (const row of rows) {
    const { rowNumber, date, store, caseUpc, invoice, quantity, rawInvDate, rawQtyShipped } = row

    if (isNaN(new Date(date).getTime())) {
      rejectedRows.push(ERRORS.custom(rowNumber, `Invalid date: ${rawInvDate}`))
      continue
    }

    if (isNaN(quantity) || quantity === 0) {
      rejectedRows.push(ERRORS.invalidQuantity(rowNumber, rawQtyShipped))
      continue
    }

    const storeId = String(parseInt(store, 10))
    const linkedCustomer = customersByBannerInternalId.get(storeId)

    if (!linkedCustomer) {
      rejectedRows.push(ERRORS.invalidSiteNumber(rowNumber, store))
      continue
    }

    const linkedProduct = upcProducts.get(caseUpc)

    if (!linkedProduct) {
      rejectedRows.push(ERRORS.invalidUPC(rowNumber, caseUpc))
      continue
    }

    const bottleQuantity = quantity * linkedProduct.packSize
    const existingKey = `${invoice}|${linkedCustomer.id}|${linkedProduct.sku}`
    const rowAlreadyExists = existingConfirmedMap.get(existingKey)

    if (rowAlreadyExists) {
      if (rowAlreadyExists.confirmedQuantity !== bottleQuantity) {
        toUpdate.push({ id: rowAlreadyExists.id, confirmedQuantity: bottleQuantity })
      } else {
        identicalRows++
      }
    } else {
      toInsert.push({
        sku: linkedProduct.sku,
        confirmedQuantity: bottleQuantity,
        netValue: '0',
        salesDocument: invoice,
        documentDate: date,
        status: 'Completed',
        salesUnit: linkedProduct.unit ?? undefined,
        customerId: linkedCustomer.id,
        deliveryDate: date,
      })
    }
  }

  const CHUNK_SIZE = 500
  await db.transaction(async (tx) => {
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const newRows = await tx
        .insert(replenOrdersConfirmed)
        .values(toInsert.slice(i, i + CHUNK_SIZE))
        .returning()
      createdRows += newRows.length
      ordersCreated += newRows.length
    }

    await Promise.all(
      toUpdate.map(({ id, confirmedQuantity }) =>
        tx.update(replenOrdersConfirmed).set({ confirmedQuantity }).where(eq(replenOrdersConfirmed.id, id)),
      ),
    )
    updatedRows = toUpdate.length
    ordersUpdated = toUpdate.length
  })

  return {
    received: totalRowsReceived,
    ordersCreated,
    ordersUpdated,
    createdRows,
    updatedRows,
    deletedRows: 0,
    identicalRows,
    rejected: rejectedRows,
  }
}
