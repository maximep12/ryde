import {
  competitorOrders,
  competitorSales,
  customers,
  customersUpc,
  dataImports,
  orders,
  ordersContent,
  productFormats,
  productSkus,
  replenOrders,
  replenOrdersContent,
  reports,
} from '@repo/db'
import { differenceInWeeks, endOfISOWeek, format, parse, parseISO, startOfISOWeek } from 'date-fns'
import { and, eq, inArray } from 'drizzle-orm'
import round from 'lodash/round.js'
import sumBy from 'lodash/sumBy.js'
import { Readable } from 'node:stream'
import { db } from '../../db'
import { parseCsvStream } from '../../lib/FileParser/csv'
import { ERRORS } from '../../utils/constants.js'
export { createReport, getReportsByType, updateReportFailure, updateReportSuccess } from '../../lib/reports'

const BANNER_RABBA = 'Rabba'
const RYDE_WEEK_0 = parseISO('2023-11-06')
const RYDE_BRANDS = new Set(['RYDE SHOT', 'C-RYDE SHOT'])
const COMPETITORS = new Set(['DOSE ENERGYSHOT', 'DOSE SHOT', '5 HOUR'])

export const REPORT_TYPE_RABBA = 'RABBA'

// ─── Data fetchers ─────────────────────────────────────────────────────────────

export async function getRabbaCustomers() {
  return db.select().from(customers).where(eq(customers.banner, BANNER_RABBA))
}

type RabbaUpcEntry = {
  customerUpc: string
  formatUpc: string | null
  sku: string | null
}

export async function getRabbaUpcData(): Promise<RabbaUpcEntry[]> {
  return db
    .select({
      customerUpc: customersUpc.customerUpc,
      formatUpc: productFormats.upc,
      sku: customersUpc.sku,
    })
    .from(customersUpc)
    .innerJoin(productSkus, eq(productSkus.sku, customersUpc.sku))
    .innerJoin(productFormats, eq(productFormats.id, productSkus.formatId))
    .where(eq(customersUpc.banner, BANNER_RABBA))
}

export async function getAvailableRabbaSkus(): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ sku: replenOrdersContent.sku })
    .from(replenOrders)
    .innerJoin(replenOrdersContent, eq(replenOrdersContent.billingDocumentId, replenOrders.billingDocumentId))
    .innerJoin(customers, eq(customers.id, replenOrders.customerId))
    .where(eq(customers.banner, BANNER_RABBA))
  return new Set(rows.map((r) => r.sku))
}

export async function getOrCreateDataImport(periodStart: string, periodEnd: string, rydeWeek: number) {
  const existing = await db
    .select()
    .from(dataImports)
    .where(
      and(
        eq(dataImports.periodStart, periodStart),
        eq(dataImports.periodEnd, periodEnd),
        eq(dataImports.fileOrigin, BANNER_RABBA),
      ),
    )
    .limit(1)

  if (existing[0]) return existing[0]

  const [created] = await db
    .insert(dataImports)
    .values({ periodStart, periodEnd, weeksIncluded: 1, rydeWeek, fileOrigin: BANNER_RABBA })
    .returning()
  if (!created) throw new Error('Failed to create data import record')
  return created
}

export async function getExistingCompetitorData(customerIds: number[], dataImportId: number, orderDate: string) {
  if (customerIds.length === 0) return { existingSales: [], existingCompOrders: [] }
  const [existingSales, existingCompOrders] = await Promise.all([
    db
      .select()
      .from(competitorSales)
      .where(and(inArray(competitorSales.customerId, customerIds), eq(competitorSales.fileImport, dataImportId))),
    db
      .select()
      .from(competitorOrders)
      .where(and(inArray(competitorOrders.customerId, customerIds), eq(competitorOrders.orderDate, orderDate))),
  ])
  return { existingSales, existingCompOrders }
}

export async function linkReportToDataImport(reportId: number, dataImportId: number) {
  await db.update(reports).set({ dataImportId }).where(eq(reports.id, reportId))
}

// ─── Processing helpers ────────────────────────────────────────────────────────

type RydeOrderItem = { quantity: number; netValue: number; sku: string; upc: string }
type CompOrderItem = { brand: string; quantity: number; netValue: number }
type StoreResult = {
  ordersCreated: number
  ordersUpdated: number
  createdRows: number
  updatedRows: number
  deletedRows: number
  identicalRows: number
}

async function processStoreRydeOrders(
  rydeOrders: RydeOrderItem[],
  customerId: number,
  orderDate: string,
  existingOrders: (typeof orders.$inferSelect)[],
  existingContentByOrderId: Map<number, (typeof ordersContent.$inferSelect)[]>,
): Promise<StoreResult> {
  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0

  if (!rydeOrders.length) {
    return { ordersCreated, ordersUpdated, createdRows, updatedRows, deletedRows, identicalRows: 0 }
  }

  // Use pre-fetched order or insert if missing
  let order = existingOrders.find((o) => o.customerId === customerId)
  if (!order) {
    const [inserted] = await db.insert(orders).values({ customerId, orderDate }).returning()
    order = inserted!
    ordersCreated++
  }

  // Group by canonical UPC and sum quantities/values
  const byUpc = new Map<string, { quantity: number; netValue: number; sku: string }>()
  for (const r of rydeOrders) {
    const entry = byUpc.get(r.upc)
    if (entry) {
      entry.quantity += r.quantity
      entry.netValue = round(entry.netValue + r.netValue, 2)
    } else {
      byUpc.set(r.upc, { quantity: r.quantity, netValue: round(r.netValue, 2), sku: r.sku })
    }
  }

  const sumByUpc = Array.from(byUpc.entries())
    .filter(([, v]) => v.quantity !== 0 && v.netValue !== 0)
    .map(([upc, v]) => ({ upc, ...v, billingDocumentId: order!.id }))

  // Use pre-fetched content rows for this order
  const existingContent = existingContentByOrderId.get(order.id) ?? []

  // Delete rows no longer in the file
  const incomingUpcs = new Set(sumByUpc.map((r) => r.upc))
  const toDelete = existingContent.filter((r) => !incomingUpcs.has(r.upc ?? ''))
  if (toDelete.length) {
    await db.delete(ordersContent).where(
      inArray(
        ordersContent.id,
        toDelete.map((r) => r.id),
      ),
    )
    deletedRows += toDelete.length
  }

  // Collect inserts and updates for content rows
  const existingContentByUpc = new Map(existingContent.map((r) => [r.upc ?? '', r]))
  const toInsertContent: (typeof ordersContent.$inferInsert)[] = []
  const toUpdateContent: Promise<unknown>[] = []

  for (const row of sumByUpc) {
    const existingRow = existingContentByUpc.get(row.upc)
    if (existingRow) {
      if (existingRow.quantity !== row.quantity || existingRow.netValue !== row.netValue) {
        toUpdateContent.push(
          db.update(ordersContent).set({ quantity: row.quantity, netValue: row.netValue }).where(eq(ordersContent.id, existingRow.id)),
        )
        updatedRows++
        ordersUpdated = 1
      }
    } else {
      toInsertContent.push({ sku: row.sku, quantity: row.quantity, netValue: row.netValue, upc: row.upc, billingDocumentId: order.id })
      createdRows++
    }
  }

  await Promise.all([
    toInsertContent.length ? db.insert(ordersContent).values(toInsertContent) : null,
    ...toUpdateContent,
  ])

  // identicalRows: when the order was already there, count original rows not created/updated
  const identicalRows = ordersCreated === 1 ? 0 : rydeOrders.length - createdRows - updatedRows

  return { ordersCreated, ordersUpdated, createdRows, updatedRows, deletedRows, identicalRows }
}

async function processStoreCompetitorData(
  rydeOrders: RydeOrderItem[],
  compOrders: CompOrderItem[],
  customerId: number,
  orderDate: string,
  dataImportId: number,
  existingSales: (typeof competitorSales.$inferSelect)[],
  existingCompOrders: (typeof competitorOrders.$inferSelect)[],
) {
  const rydeUnits = sumBy(rydeOrders, 'quantity')
  const rydeValue = round(sumBy(rydeOrders, 'netValue'), 2)
  const romUnits = sumBy(compOrders, 'quantity')
  const romValue = round(sumBy(compOrders, 'netValue'), 2)

  const linkedSale = existingSales.find((s) => s.customerId === customerId)
  const saleData = { rydeUnits, rydeValue, romUnits, romValue, customerId, fileImport: dataImportId }

  if (linkedSale) {
    await db.update(competitorSales).set(saleData).where(eq(competitorSales.id, linkedSale.id))
  } else {
    await db.insert(competitorSales).values(saleData)
  }

  // Process competitor orders by brand
  const ordersForCustomer = existingCompOrders.filter((o) => o.customerId === customerId)
  const incomingBrands = new Set(compOrders.map((o) => o.brand))

  // Batch-delete brands no longer present in the file
  const toDeleteIds = ordersForCustomer.filter((o) => !incomingBrands.has(o.brand ?? '')).map((o) => o.id)
  const toInsert: (typeof competitorOrders.$inferInsert)[] = []
  const toUpdate: Promise<unknown>[] = []

  // Collect inserts and updates
  for (const comp of compOrders) {
    const existing = ordersForCustomer.find((o) => o.brand === comp.brand)
    const value = String(round(comp.netValue, 2))
    if (existing) {
      if (Number(existing.quantity) !== comp.quantity || Number(existing.value) !== comp.netValue) {
        toUpdate.push(
          db.update(competitorOrders).set({ quantity: comp.quantity, value }).where(eq(competitorOrders.id, existing.id)),
        )
      }
    } else {
      toInsert.push({ customerId, brand: comp.brand, quantity: comp.quantity, value, orderDate })
    }
  }

  await Promise.all([
    toDeleteIds.length ? db.delete(competitorOrders).where(inArray(competitorOrders.id, toDeleteIds)) : null,
    toInsert.length ? db.insert(competitorOrders).values(toInsert) : null,
    ...toUpdate,
  ])
}

// ─── Main export ───────────────────────────────────────────────────────────────

export type RabbaProcessResult = {
  received: number
  ordersCreated: number
  ordersUpdated: number
  rejected: string[]
  createdRows: number
  updatedRows: number
  deletedRows: number
  identicalRows: number
  dataImportId: number
}

export async function processRabbaFile(buffer: Buffer): Promise<RabbaProcessResult> {
  const rawRows = (await parseCsvStream(Readable.from(buffer))).filter((r) => r.weekend != null && r.weekend !== '')

  // Validate all rows share the same date
  let fileDate: string | undefined
  for (const row of rawRows) {
    const weekend = String(row.weekend)
    if (!fileDate) {
      fileDate = weekend
    } else if (fileDate !== weekend) {
      const err = ERRORS.invalidDates(fileDate, { row: Number(row.rowNumber), date: weekend })
      throw Object.assign(new Error(err), { code: 406 })
    }
  }
  if (!fileDate) throw Object.assign(new Error('File is empty.'), { code: 406 })

  const parsedDate = parse(fileDate, 'dd-MMM-yy', new Date())
  const periodStart = format(startOfISOWeek(parsedDate), 'yyyy-MM-dd')
  const periodEnd = format(endOfISOWeek(parsedDate), 'yyyy-MM-dd')
  const rydeWeek = differenceInWeeks(parsedDate, RYDE_WEEK_0)

  const [rabbaCustomers, upcData, dataImport] = await Promise.all([
    getRabbaCustomers(),
    getRabbaUpcData(),
    getOrCreateDataImport(periodStart, periodEnd, rydeWeek),
  ])

  // Build lookup maps to avoid O(n*m) linear scans
  const customerByStoreId = new Map(rabbaCustomers.map((c) => [c.bannerInternalId, c]))

  const rejected: string[] = []

  type StoreEntry = {
    ryde: RydeOrderItem[]
    comps: CompOrderItem[]
    address: { address: string; city: string }
  }
  const storeMap = new Map<string, StoreEntry>()

  for (const r of rawRows) {
    const row = Number(r.rowNumber)
    const storeId = String(r.store ?? '')
    const storeAddr = String(r.storeaddr ?? '')
    const city = String(r.storecity ?? '')
    const brand = String(r.brand ?? '')
    const upc = String(r.upc ?? '')
    const units = String(r.units ?? '')
    const salesqty = r.salesqty ?? 0
    const salesamt = r.salesamt ?? 0

    const customer = customerByStoreId.get(storeId)
    if (!customer) {
      rejected.push(ERRORS.invalidERP(row, storeId))
      continue
    }

    if (Number(salesqty) === 0) {
      rejected.push(ERRORS.invalidQuantity(row, salesamt))
      continue
    }

    if (Number(salesamt) === 0) {
      rejected.push(ERRORS.custom(row, `Salesamt equals 0`))
      continue
    }

    // Apply pack-size multiplier from UNITS field (e.g. "12x250mL" → multiply by 12)
    let quantity = Number(salesqty)
    if (units.includes('x')) {
      const parts = units.match(/\d+/g)
      if (!parts || parts.length !== 2) {
        rejected.push(ERRORS.invalidUnit(row, units))
        continue
      }
      quantity *= Number(parts[0])
    }
    if (Number(salesamt) < 0) quantity *= -1

    const storeEntry = storeMap.get(storeId) ?? { ryde: [], comps: [], address: { address: '', city: '' } }
    storeEntry.address = { address: storeAddr, city }

    if (RYDE_BRANDS.has(brand)) {
      const upcEntry = upcData.find((e) => e.customerUpc.includes(upc) || upc.includes(e.customerUpc))
      if (!upcEntry) {
        console.log({ upcData, upc })
        rejected.push(ERRORS.custom(row, `Unknown UPC provided: ${upc}. Please contact Volume 7 to validate.`))
        continue
      }
      if (!upcEntry.sku) {
        rejected.push(ERRORS.custom(row, `No SKU mapped for UPC: ${upc}. Please contact Volume 7 to validate.`))
        continue
      }

      storeEntry.ryde.push({ quantity, netValue: Number(salesamt), sku: upcEntry.sku, upc: upcEntry.formatUpc ?? upc })
    } else if (COMPETITORS.has(brand)) {
      storeEntry.comps.push({ brand, quantity, netValue: Number(salesamt) })
    }

    storeMap.set(storeId, storeEntry)
  }

  const customerIds = Array.from(storeMap.keys(), (storeId) => customerByStoreId.get(storeId)?.id as number)

  // Batch-fetch all existing orders and content rows up front (avoids N+1 per store)
  const [{ existingSales, existingCompOrders }, existingOrderRows] = await Promise.all([
    getExistingCompetitorData(customerIds, dataImport.id, periodStart),
    customerIds.length
      ? db
          .select()
          .from(orders)
          .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
      : Promise.resolve([] as (typeof orders.$inferSelect)[]),
  ])

  const existingOrderIds = existingOrderRows.map((o) => o.id)
  const existingContentRows = existingOrderIds.length
    ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
    : []

  const existingContentByOrderId = new Map<number, (typeof ordersContent.$inferSelect)[]>()
  for (const row of existingContentRows) {
    const list = existingContentByOrderId.get(row.billingDocumentId) ?? []
    list.push(row)
    existingContentByOrderId.set(row.billingDocumentId, list)
  }

  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0

  await Promise.all(
    Array.from(storeMap.entries()).map(async ([storeId, storeData]) => {
      const customer = customerByStoreId.get(storeId)
      if (!customer) return

      // Competitor rows are counted as identical (separate metric)
      identicalRows += storeData.comps.length

      // Update customer address if it changed
      const currentAddress = customer.address as { address?: string; city?: string } | null
      const newAddress = storeData.address
      if (JSON.stringify(currentAddress) !== JSON.stringify(newAddress)) {
        await db.update(customers).set({ address: newAddress }).where(eq(customers.id, customer.id))
        customer.address = newAddress
      }

      await processStoreCompetitorData(
        storeData.ryde,
        storeData.comps,
        customer.id,
        periodStart,
        dataImport.id,
        existingSales,
        existingCompOrders,
      )

      const result = await processStoreRydeOrders(
        storeData.ryde,
        customer.id,
        periodStart,
        existingOrderRows,
        existingContentByOrderId,
      )
      ordersCreated += result.ordersCreated
      ordersUpdated += result.ordersUpdated
      createdRows += result.createdRows
      updatedRows += result.updatedRows
      deletedRows += result.deletedRows
      identicalRows += result.identicalRows
    }),
  )

  return {
    received: rawRows.length,
    ordersCreated,
    ordersUpdated,
    rejected,
    createdRows,
    updatedRows,
    deletedRows,
    identicalRows,
    dataImportId: dataImport.id,
  }
}
