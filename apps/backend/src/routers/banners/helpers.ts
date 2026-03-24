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
import {
  differenceInWeeks,
  endOfISOWeek,
  endOfMonth,
  format,
  parse,
  parseISO,
  startOfISOWeek,
  startOfMonth,
} from 'date-fns'
import { and, eq, inArray, like, notLike, or, sql } from 'drizzle-orm'
import round from 'lodash/round.js'
import sumBy from 'lodash/sumBy.js'
import { Readable } from 'node:stream'
import { db } from '../../db'
import { parseCircleKSellOut } from '../../lib/FileParser/circleKExcel'
import { parseCsvStream } from '../../lib/FileParser/csv'
import { readExcelFile } from '../../lib/FileParser/excel'
import { parseLoblawsCsv } from '../../lib/FileParser/loblawsCsv'
import { parseParklandSellOut } from '../../lib/FileParser/parklandExcel'
import { parsePetroCanadaSellOut } from '../../lib/FileParser/petroCanadaExcel'
import { parseSevenElevenWHToStore } from '../../lib/FileParser/sevenElevenExcel'
import { bufferToStream } from '../../lib/fileUpload'
import { ERRORS } from '../../utils/constants.js'
export {
  createReport,
  getAllReports,
  getDistinctReportTypes,
  getReportById,
  getReportsByType,
  updateReportFailure,
  updateReportSuccess,
} from '../../lib/reports'

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
          db
            .update(ordersContent)
            .set({ quantity: row.quantity, netValue: row.netValue })
            .where(eq(ordersContent.id, existingRow.id)),
        )
        updatedRows++
        ordersUpdated = 1
      }
    } else {
      toInsertContent.push({
        sku: row.sku,
        quantity: row.quantity,
        netValue: row.netValue,
        upc: row.upc,
        billingDocumentId: order.id,
      })
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
          db
            .update(competitorOrders)
            .set({ quantity: comp.quantity, value })
            .where(eq(competitorOrders.id, existing.id)),
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

// ─── Circle K constants ───────────────────────────────────────────────────────

const CIRCLE_K_BANNER_GLOBAL = 'CIRCLE K ON'
const CIRCLE_K_BANNER_SEARCH = 'Circle K'
const CIRCLE_K_BANNER_VALUES = [
  'CIRCLE K ON',
  'Circle K - Atl',
  'Circle K - West',
  'Circle K - ON',
  'Circle K - QC (DC)',
  'Circle K',
]
const RYDE_WEEK_0_CIRCLE_K = parseISO('2023-11-06')

export const REPORT_TYPE_CIRCLE_K = 'CIRCLE_K_GLOBAL'
export const REPORT_TYPE_CIRCLE_K_QCATL = 'CIRCLE_K_QC_ATL'

const CIRCLE_K_QCATL_BANNER = 'Circle K - QC ATL'

// ─── Circle K data fetchers ───────────────────────────────────────────────────

async function getCircleKCustomers() {
  return db
    .select()
    .from(customers)
    .where(and(inArray(customers.banner, CIRCLE_K_BANNER_VALUES), notLike(customers.banner, '%Circle K - QC%')))
}

async function getCircleKQcAtlCustomers() {
  return db
    .select()
    .from(customers)
    .where(or(like(customers.banner, '%Circle K - QC%'), like(customers.banner, '%Circle K - Atl%')))
}

async function getCircleKQcAtlUpcData(): Promise<CircleKUpcEntry[]> {
  return db
    .select({ customerUpc: customersUpc.customerUpc, sku: customersUpc.sku })
    .from(customersUpc)
    .where(eq(customersUpc.banner, CIRCLE_K_QCATL_BANNER))
}

type CircleKUpcEntry = { customerUpc: string; sku: string | null }

async function getCircleKUpcData(): Promise<CircleKUpcEntry[]> {
  return db
    .select({ customerUpc: customersUpc.customerUpc, sku: productSkus.sku })
    .from(customersUpc)
    .innerJoin(productSkus, eq(productSkus.formatId, customersUpc.formatId))
    .where(like(customersUpc.banner, `%${CIRCLE_K_BANNER_SEARCH}%`))
}

async function getOrCreateCircleKDataImport(periodStart: string, periodEnd: string, rydeWeek: number) {
  const existing = await db
    .select()
    .from(dataImports)
    .where(
      and(
        eq(dataImports.periodStart, periodStart),
        eq(dataImports.periodEnd, periodEnd),
        eq(dataImports.fileOrigin, CIRCLE_K_BANNER_GLOBAL),
      ),
    )
    .limit(1)

  if (existing[0]) return existing[0]

  const [created] = await db
    .insert(dataImports)
    .values({ periodStart, periodEnd, weeksIncluded: 1, rydeWeek, fileOrigin: CIRCLE_K_BANNER_GLOBAL })
    .returning()
  if (!created) throw new Error('Failed to create Circle K data import record')
  return created
}

// ─── Circle K Global — save one week of data ─────────────────────────────────

type CircleKWeekResult = {
  ordersCreated: number
  ordersUpdated: number
  createdRows: number
  updatedRows: number
  deletedRows: number
  identicalRows: number
  rejected: string[]
}

async function saveCircleKWeek(
  weekSales: {
    id: string
    lines: number[]
    ryde: { byUpc: Record<string, { units: number; sales: number }> }
    rom: { units: number; sales: number }
  }[],
  periodStart: string,
  periodEnd: string,
  dataImportId: number,
  circleKCustomers: (typeof customers.$inferSelect)[],
  circleKUpcs: CircleKUpcEntry[],
): Promise<CircleKWeekResult> {
  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  const deletedRows = 0
  let identicalRows = 0
  const rejected: string[] = []

  const customerIds = circleKCustomers.map((c) => c.id)
  const customerByBannerInternalId = new Map(circleKCustomers.map((c) => [c.bannerInternalId, c]))
  const upcByCustUpc = new Map(circleKUpcs.map((p) => [p.customerUpc, p]))

  const [existingCompSales, existingOrderRows] = await Promise.all([
    db.select().from(competitorSales).where(eq(competitorSales.fileImport, dataImportId)),
    customerIds.length
      ? db
          .select()
          .from(orders)
          .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
      : Promise.resolve([] as (typeof orders.$inferSelect)[]),
  ])

  const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))
  const compByCustomerId = new Map(existingCompSales.map((cs) => [cs.customerId, cs]))

  const existingOrderIds = existingOrderRows.map((o) => o.id)
  const existingContentRows = existingOrderIds.length
    ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
    : []

  const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
  for (const row of existingContentRows) {
    let upcMap = existingContentByOrderId.get(row.billingDocumentId)
    if (!upcMap) {
      upcMap = new Map()
      existingContentByOrderId.set(row.billingDocumentId, upcMap)
    }
    upcMap.set(row.upc, row)
  }

  for (const { id: storeId, lines, ryde, rom } of weekSales) {
    const customer = customerByBannerInternalId.get(storeId)

    if (!customer) {
      rejected.push(ERRORS.invalidSiteNumber(`[${lines.join(', ')}]`, storeId))
      continue
    }

    // Build order content from byUpc
    const content: { sku: string; quantity: number; netValue: number; upc: string }[] = []
    for (const [upc, { units, sales }] of Object.entries(ryde.byUpc)) {
      const linked = upcByCustUpc.get(upc)
      if (!linked || !linked.sku) {
        rejected.push(ERRORS.invalidUPC(`[${lines.join(', ')}]`, upc))
        continue
      }
      content.push({ sku: linked.sku, quantity: units, netValue: sales, upc })
    }

    if (content.length > 0) {
      const existingOrder = orderByCustomerId.get(customer.id)

      if (existingOrder) {
        const existingUpcMap = existingContentByOrderId.get(existingOrder.id)
        const toInsert: (typeof ordersContent.$inferInsert)[] = []
        const toUpdate: Promise<unknown>[] = []

        for (const item of content) {
          const existing = existingUpcMap?.get(item.upc)
          if (existing) {
            if (existing.quantity !== item.quantity || existing.netValue !== item.netValue) {
              toUpdate.push(
                db
                  .update(ordersContent)
                  .set({ quantity: item.quantity, netValue: item.netValue })
                  .where(eq(ordersContent.id, existing.id)),
              )
              updatedRows++
              ordersUpdated = 1
            } else {
              identicalRows++
            }
          } else {
            toInsert.push({
              sku: item.sku,
              quantity: item.quantity,
              netValue: item.netValue,
              upc: item.upc,
              billingDocumentId: existingOrder.id,
            })
            createdRows++
          }
        }

        await Promise.all([toInsert.length ? db.insert(ordersContent).values(toInsert) : null, ...toUpdate])
      } else {
        const [newOrder] = await db
          .insert(orders)
          .values({ customerId: customer.id, orderDate: periodStart })
          .returning()
        if (!newOrder) continue
        ordersCreated++

        const toInsert = content.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          netValue: item.netValue,
          upc: item.upc,
          billingDocumentId: newOrder.id,
        }))
        await db.insert(ordersContent).values(toInsert)
        createdRows += toInsert.length
      }
    }

    // Competitor sales
    const compData = {
      customerId: customer.id,
      rydeUnits: Object.values(ryde.byUpc).reduce((s, v) => s + v.units, 0),
      rydeValue: round(
        Object.values(ryde.byUpc).reduce((s, v) => s + v.sales, 0),
        2,
      ),
      romUnits: rom.units,
      romValue: round(rom.sales, 2),
      fileImport: dataImportId,
    }

    const existingComp = compByCustomerId.get(customer.id)
    if (existingComp) {
      if (
        existingComp.rydeUnits !== compData.rydeUnits ||
        existingComp.rydeValue !== compData.rydeValue ||
        existingComp.romUnits !== compData.romUnits ||
        existingComp.romValue !== compData.romValue
      ) {
        await db.update(competitorSales).set(compData).where(eq(competitorSales.id, existingComp.id))
        updatedRows++
      } else {
        identicalRows++
      }
    } else {
      await db.insert(competitorSales).values(compData)
      createdRows++
    }
  }

  return { ordersCreated, ordersUpdated, createdRows, updatedRows, deletedRows, identicalRows, rejected }
}

// ─── Circle K Global — main export ───────────────────────────────────────────

export type CircleKProcessResult = {
  received: number
  ordersCreated: number
  ordersUpdated: number
  createdRows: number
  updatedRows: number
  deletedRows: number
  identicalRows: number
  rejected: string[]
  dataImportId: number
}

export async function processCircleKFile(buffer: Buffer): Promise<CircleKProcessResult> {
  const { data, totalRowsReceived } = await parseCircleKSellOut({ stream: bufferToStream(buffer) })

  if (totalRowsReceived === 0) {
    throw Object.assign(new Error('No data found in Circle K file.'), { code: 406 })
  }

  const [circleKCustomers, circleKUpcs] = await Promise.all([getCircleKCustomers(), getCircleKUpcData()])

  const weekResults = await Promise.all(
    data.map(async ({ date, sales }) => {
      const periodStart = format(startOfISOWeek(new Date(date + 'T00:00:00Z')), 'yyyy-MM-dd')
      const periodEnd = format(endOfISOWeek(new Date(date + 'T00:00:00Z')), 'yyyy-MM-dd')
      const rydeWeek = differenceInWeeks(new Date(date + 'T00:00:00Z'), RYDE_WEEK_0_CIRCLE_K)

      const dataImport = await getOrCreateCircleKDataImport(periodStart, periodEnd, rydeWeek)
      const weekResult = await saveCircleKWeek(
        sales,
        periodStart,
        periodEnd,
        dataImport.id,
        circleKCustomers,
        circleKUpcs,
      )

      return { dataImportId: dataImport.id, ...weekResult }
    }),
  )

  const totals = weekResults.reduce(
    (acc, r) => {
      acc.ordersCreated += r.ordersCreated
      acc.ordersUpdated += r.ordersUpdated
      acc.createdRows += r.createdRows
      acc.updatedRows += r.updatedRows
      acc.deletedRows += r.deletedRows
      acc.identicalRows += r.identicalRows
      acc.rejected.push(...r.rejected)
      acc.dataImportId = r.dataImportId
      return acc
    },
    {
      ordersCreated: 0,
      ordersUpdated: 0,
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [] as string[],
      dataImportId: 0,
    },
  )

  return { received: totalRowsReceived, ...totals }
}

// ─── Circle K QC+ATL — main export ───────────────────────────────────────────

export type CircleKQcAtlProcessResult = {
  received: number
  ordersCreated: number
  ordersUpdated: number
  createdRows: number
  updatedRows: number
  deletedRows: number
  identicalRows: number
  rejected: string[]
  dataImportId: number
}

export async function processCircleKQcAtlFile(buffer: Buffer): Promise<CircleKQcAtlProcessResult> {
  const contentBySheet = await readExcelFile({
    stream: bufferToStream(buffer),
    expected: [{ sheetName: 'Export', columns: ['ERP', 'Item Description', 'DATE', 'VENTES'] }],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName === 'Export')
  if (!reportData) throw Object.assign(new Error('Missing expected Export sheet.'), { code: 406 })

  const receivedRows = reportData.values

  const INVALID_DATE = 'INVALID_DATE'

  // Group rows by ISO week start
  const rowsByWeek = new Map<string, typeof receivedRows>()
  for (const row of receivedRows) {
    const dateVal = row['date']
    if (!dateVal) {
      const bucket = rowsByWeek.get(INVALID_DATE) ?? []
      bucket.push(row)
      rowsByWeek.set(INVALID_DATE, bucket)
      continue
    }
    const weekKey = format(startOfISOWeek(new Date(String(dateVal))), 'yyyy-MM-dd')
    const bucket = rowsByWeek.get(weekKey) ?? []
    bucket.push(row)
    rowsByWeek.set(weekKey, bucket)
  }

  const [circleKCustomers, circleKQcAtlUpcs] = await Promise.all([getCircleKQcAtlCustomers(), getCircleKQcAtlUpcData()])

  // Build lookup maps once instead of scanning arrays per row
  const customerByBatId = new Map(circleKCustomers.map((c) => [String(c.batId), c]))
  const customerIds = circleKCustomers.map((c) => c.id)

  // Handle invalid date rows upfront
  const invalidDateRows = rowsByWeek.get(INVALID_DATE)
  const initialRejected: string[] = invalidDateRows
    ? [ERRORS.custom(invalidDateRows.map((r) => r['rowNumber'] as number).join(', '), 'Invalid date provided')]
    : []

  const validWeeks = [...rowsByWeek.entries()].filter(([key]) => key !== INVALID_DATE)

  const weekResults = await Promise.all(
    validWeeks.map(async ([weekKey, weekRows]) => {
      const periodStartDate = new Date(weekKey + 'T00:00:00Z')
      const periodStart = format(periodStartDate, 'yyyy-MM-dd')
      const periodEnd = format(endOfISOWeek(periodStartDate), 'yyyy-MM-dd')
      const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_CIRCLE_K)

      const dataImport = await getOrCreateCircleKDataImport(periodStart, periodEnd, rydeWeek)

      const existingOrderRows = customerIds.length
        ? await db
            .select()
            .from(orders)
            .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
        : []

      const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))

      const existingOrderIds = existingOrderRows.map((o) => o.id)
      const existingContentRows = existingOrderIds.length
        ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
        : []

      const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
      for (const row of existingContentRows) {
        let upcMap = existingContentByOrderId.get(row.billingDocumentId)
        if (!upcMap) {
          upcMap = new Map()
          existingContentByOrderId.set(row.billingDocumentId, upcMap)
        }
        upcMap.set(row.upc, row)
      }

      // Group rows by ERP
      const byErp = new Map<string, typeof weekRows>()
      for (const row of weekRows) {
        const erp = String(row['erp'] ?? '')
        const bucket = byErp.get(erp) ?? []
        bucket.push(row)
        byErp.set(erp, bucket)
      }

      type StoreResult = {
        ordersCreated: number
        ordersUpdated: number
        createdRows: number
        updatedRows: number
        identicalRows: number
        rejected: string[]
        invalidCustomer: { id: string; rows: number[] } | null
      }

      // Process all stores in this week in parallel
      const storeResults = await Promise.all(
        [...byErp.entries()].map(async ([erp, storeRows]): Promise<StoreResult> => {
          const base: StoreResult = {
            ordersCreated: 0,
            ordersUpdated: 0,
            createdRows: 0,
            updatedRows: 0,
            identicalRows: 0,
            rejected: [],
            invalidCustomer: null,
          }

          if (!erp) {
            return { ...base, invalidCustomer: { id: '(empty)', rows: storeRows.map((r) => r['rowNumber'] as number) } }
          }

          const customer = customerByBatId.get(erp)
          if (!customer) {
            return { ...base, invalidCustomer: { id: erp, rows: storeRows.map((r) => r['rowNumber'] as number) } }
          }

          const content: { sku: string; quantity: number; netValue: number; upc: string }[] = []
          const storeRejected: string[] = []
          for (const storeRow of storeRows) {
            const quantity = Number(storeRow['ventes'] ?? 0)
            if (!quantity) continue

            const itemDescription = String(storeRow['itemDescription'] ?? '')
            const linkedProduct = circleKQcAtlUpcs.find((p) => itemDescription.includes(p.customerUpc))
            if (!linkedProduct || !linkedProduct.sku) {
              storeRejected.push(
                ERRORS.custom(
                  storeRow['rowNumber'] as number,
                  `Could not map Item Description "${itemDescription}" to a product`,
                ),
              )
              continue
            }
            content.push({ sku: linkedProduct.sku, quantity, netValue: 0, upc: itemDescription })
          }

          if (content.length === 0) return { ...base, rejected: storeRejected }

          const existingOrder = orderByCustomerId.get(customer.id)

          if (existingOrder) {
            const existingUpcMap = existingContentByOrderId.get(existingOrder.id)
            const toInsert: (typeof ordersContent.$inferInsert)[] = []
            const toUpdate: Promise<unknown>[] = []
            let updatedRows = 0
            let identicalRows = 0

            for (const item of content) {
              const existing = existingUpcMap?.get(item.upc)
              if (existing) {
                if (existing.quantity !== item.quantity) {
                  toUpdate.push(
                    db.update(ordersContent).set({ quantity: item.quantity }).where(eq(ordersContent.id, existing.id)),
                  )
                  updatedRows++
                } else {
                  identicalRows++
                }
              } else {
                toInsert.push({
                  sku: item.sku,
                  quantity: item.quantity,
                  netValue: item.netValue,
                  upc: item.upc,
                  billingDocumentId: existingOrder.id,
                })
              }
            }

            await Promise.all([toInsert.length ? db.insert(ordersContent).values(toInsert) : null, ...toUpdate])
            const ordersUpdated = toInsert.length > 0 || toUpdate.length > 0 ? 1 : 0
            return {
              ...base,
              rejected: storeRejected,
              ordersUpdated,
              createdRows: toInsert.length,
              updatedRows,
              identicalRows,
            }
          } else {
            const [newOrder] = await db
              .insert(orders)
              .values({ customerId: customer.id, orderDate: periodStart })
              .returning()
            if (!newOrder) return { ...base, rejected: storeRejected }

            const toInsert = content.map((item) => ({
              sku: item.sku,
              quantity: item.quantity,
              netValue: item.netValue,
              upc: item.upc,
              billingDocumentId: newOrder.id,
            }))
            await db.insert(ordersContent).values(toInsert)
            return { ...base, rejected: storeRejected, ordersCreated: 1, createdRows: toInsert.length }
          }
        }),
      )

      const weekTotals = storeResults.reduce(
        (acc, r) => {
          acc.ordersCreated += r.ordersCreated
          acc.ordersUpdated = Math.max(acc.ordersUpdated, r.ordersUpdated)
          acc.createdRows += r.createdRows
          acc.updatedRows += r.updatedRows
          acc.identicalRows += r.identicalRows
          acc.rejected.push(...r.rejected)
          if (r.invalidCustomer) acc.invalidCustomerIds.push(r.invalidCustomer)
          return acc
        },
        {
          ordersCreated: 0,
          ordersUpdated: 0,
          createdRows: 0,
          updatedRows: 0,
          identicalRows: 0,
          rejected: [] as string[],
          invalidCustomerIds: [] as { id: string; rows: number[] }[],
        },
      )

      return { dataImportId: dataImport.id, ...weekTotals }
    }),
  )

  const totals = weekResults.reduce(
    (acc, r) => {
      acc.ordersCreated += r.ordersCreated
      acc.ordersUpdated = Math.max(acc.ordersUpdated, r.ordersUpdated)
      acc.createdRows += r.createdRows
      acc.updatedRows += r.updatedRows
      acc.identicalRows += r.identicalRows
      acc.rejected.push(...r.rejected)
      acc.invalidCustomerIds.push(...r.invalidCustomerIds)
      acc.lastDataImportId = r.dataImportId
      return acc
    },
    {
      ordersCreated: 0,
      ordersUpdated: 0,
      createdRows: 0,
      updatedRows: 0,
      identicalRows: 0,
      rejected: initialRejected,
      invalidCustomerIds: [] as { id: string; rows: number[] }[],
      lastDataImportId: 0,
    },
  )

  // Build invalid customer error messages
  const groupedInvalid = new Map<string, number[]>()
  for (const { id, rows } of totals.invalidCustomerIds) {
    const existing = groupedInvalid.get(id) ?? []
    groupedInvalid.set(id, [...existing, ...rows])
  }
  for (const [id, rows] of groupedInvalid.entries()) {
    totals.rejected.push(ERRORS.invalidSiteNumber(rows.join(', '), id))
  }

  const { ordersCreated, ordersUpdated, createdRows, updatedRows, identicalRows, rejected, lastDataImportId } = totals

  return {
    received: receivedRows.length,
    ordersCreated,
    ordersUpdated,
    createdRows,
    updatedRows,
    deletedRows: 0,
    identicalRows,
    rejected,
    dataImportId: lastDataImportId,
  }
}

// ─── Generic data import helper ───────────────────────────────────────────────

const RYDE_WEEK_0_GENERIC = parseISO('2023-11-06')

async function getOrCreateBannerDataImport(
  periodStart: string,
  periodEnd: string,
  rydeWeek: number,
  fileOrigin: string,
) {
  const existing = await db
    .select()
    .from(dataImports)
    .where(
      and(
        eq(dataImports.periodStart, periodStart),
        eq(dataImports.periodEnd, periodEnd),
        eq(dataImports.fileOrigin, fileOrigin),
      ),
    )
    .limit(1)

  if (existing[0]) return existing[0]

  const [created] = await db
    .insert(dataImports)
    .values({ periodStart, periodEnd, weeksIncluded: 1, rydeWeek, fileOrigin })
    .returning()
  if (!created) throw new Error(`Failed to create data import record for ${fileOrigin}`)
  return created
}

function buildInvalidCustomerErrors(invalidCustomers: { id: string; rows: number[] }[]): string[] {
  const grouped = new Map<string, number[]>()
  for (const { id, rows } of invalidCustomers) {
    const existing = grouped.get(id) ?? []
    grouped.set(id, [...existing, ...rows])
  }
  return Array.from(grouped.entries()).map(([id, rows]) => ERRORS.invalidSiteNumber(rows.join(', '), id))
}

// ─── NAP Orange ───────────────────────────────────────────────────────────────

const BANNER_NAP_ORANGE = 'NAP Orange'

export const REPORT_TYPE_NAP_ORANGE = 'NAP_ORANGE'

async function getNapOrangeCustomers() {
  return db
    .select()
    .from(customers)
    .where(like(customers.banner, `%${BANNER_NAP_ORANGE}%`))
}

async function getNapOrangeUpcData() {
  return db
    .select({ customerUpc: customersUpc.customerUpc, sku: customersUpc.sku })
    .from(customersUpc)
    .where(eq(customersUpc.banner, BANNER_NAP_ORANGE))
}

export type NapOrangeProcessResult = {
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

export async function processNapOrangeFile(buffer: Buffer): Promise<NapOrangeProcessResult> {
  const contentBySheet = await readExcelFile({
    stream: bufferToStream(buffer),
    expected: [
      {
        sheetName: 'DATA',
        columns: [
          'Week',
          'Week Wending Date',
          'Location',
          'Site Name',
          'Store',
          'ERP',
          'TM',
          'OT',
          'Site_Details',
          'Description',
          'Total Qty',
          'Total Amount',
        ],
      },
    ],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName === 'DATA')
  if (!reportData) throw Object.assign(new Error('Missing expected DATA sheet.'), { code: 406 })

  const receivedRows = reportData.values

  const INVALID_DATE = 'INVALID_DATE'

  // Group rows by ISO week start
  const rowsByWeek = new Map<string, typeof receivedRows>()
  for (const row of receivedRows) {
    const dateVal = row['weekWendingDate']
    if (!dateVal) {
      const bucket = rowsByWeek.get(INVALID_DATE) ?? []
      bucket.push(row)
      rowsByWeek.set(INVALID_DATE, bucket)
      continue
    }
    const weekKey = format(startOfISOWeek(new Date(String(dateVal))), 'yyyy-MM-dd')
    const bucket = rowsByWeek.get(weekKey) ?? []
    bucket.push(row)
    rowsByWeek.set(weekKey, bucket)
  }

  const [napOrangeCustomers, napOrangeUpcs] = await Promise.all([getNapOrangeCustomers(), getNapOrangeUpcData()])

  const customerByBatId = new Map(napOrangeCustomers.map((c) => [String(c.batId), c]))
  const upcByCustomerUpc = new Map(napOrangeUpcs.map((p) => [p.customerUpc, p]))
  const customerIds = napOrangeCustomers.map((c) => c.id)

  const invalidDateRows = rowsByWeek.get(INVALID_DATE)
  const initialRejected: string[] = invalidDateRows
    ? [ERRORS.custom(invalidDateRows.map((r) => r['rowNumber'] as number).join(', '), 'Invalid date provided')]
    : []

  const validWeeks = [...rowsByWeek.entries()].filter(([key]) => key !== INVALID_DATE)

  const weekResults = await Promise.all(
    validWeeks.map(async ([weekKey, weekRows]) => {
      const periodStartDate = new Date(weekKey + 'T00:00:00Z')
      const periodStart = format(periodStartDate, 'yyyy-MM-dd')
      const periodEnd = format(endOfISOWeek(periodStartDate), 'yyyy-MM-dd')
      const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_GENERIC)

      const dataImport = await getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_NAP_ORANGE)

      // Fetch existing orders for this week
      const existingOrderRows = customerIds.length
        ? await db
            .select()
            .from(orders)
            .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
        : []

      const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))

      const existingOrderIds = existingOrderRows.map((o) => o.id)
      const existingContentRows = existingOrderIds.length
        ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
        : []

      const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
      for (const row of existingContentRows) {
        let upcMap = existingContentByOrderId.get(row.billingDocumentId)
        if (!upcMap) {
          upcMap = new Map()
          existingContentByOrderId.set(row.billingDocumentId, upcMap)
        }
        upcMap.set(row.upc, row)
      }

      // Group rows by ERP
      const byErp = new Map<string, typeof weekRows>()
      for (const row of weekRows) {
        const erp = String(row['erp'] ?? '')
        const bucket = byErp.get(erp) ?? []
        bucket.push(row)
        byErp.set(erp, bucket)
      }

      const storeResults = await Promise.all(
        [...byErp.entries()].map(async ([erp, storeRows]) => {
          const base = {
            ordersCreated: 0,
            ordersUpdated: 0,
            createdRows: 0,
            updatedRows: 0,
            identicalRows: 0,
            rejected: [] as string[],
            invalidCustomer: null as { id: string; rows: number[] } | null,
          }

          if (!erp)
            return { ...base, invalidCustomer: { id: '(empty)', rows: storeRows.map((r) => r['rowNumber'] as number) } }

          const customer = customerByBatId.get(erp)
          if (!customer)
            return { ...base, invalidCustomer: { id: erp, rows: storeRows.map((r) => r['rowNumber'] as number) } }

          const content: { sku: string; quantity: number; netValue: number; upc: string }[] = []
          const storeRejected: string[] = []

          for (const storeRow of storeRows) {
            const quantity = Number(storeRow['totalQty'] ?? 0)
            if (!quantity || quantity === 0) continue

            const description = String(storeRow['description'] ?? '')
            const linkedProduct = upcByCustomerUpc.get(description)
            if (!linkedProduct || !linkedProduct.sku) {
              storeRejected.push(
                ERRORS.custom(
                  storeRow['rowNumber'] as number,
                  `Could not map Description "${description}" to a product`,
                ),
              )
              continue
            }

            content.push({
              sku: linkedProduct.sku,
              quantity,
              netValue: round(Number(storeRow['totalAmount']) || 0, 2),
              upc: description,
            })
          }

          if (content.length === 0) return { ...base, rejected: storeRejected }

          const existingOrder = orderByCustomerId.get(customer.id)

          if (existingOrder) {
            const existingUpcMap = existingContentByOrderId.get(existingOrder.id)
            const toInsert: (typeof ordersContent.$inferInsert)[] = []
            const toUpdate: Promise<unknown>[] = []
            let updatedRows = 0
            let identicalRows = 0

            for (const item of content) {
              const existing = existingUpcMap?.get(item.upc)
              if (existing) {
                if (existing.quantity !== item.quantity || round(existing.netValue ?? 0, 2) !== item.netValue) {
                  toUpdate.push(
                    db
                      .update(ordersContent)
                      .set({ quantity: item.quantity, netValue: item.netValue })
                      .where(eq(ordersContent.id, existing.id)),
                  )
                  updatedRows++
                } else {
                  identicalRows++
                }
              } else {
                toInsert.push({
                  sku: item.sku,
                  quantity: item.quantity,
                  netValue: item.netValue,
                  upc: item.upc,
                  billingDocumentId: existingOrder.id,
                })
              }
            }

            await Promise.all([toInsert.length ? db.insert(ordersContent).values(toInsert) : null, ...toUpdate])
            const ordersUpdated = toInsert.length > 0 || toUpdate.length > 0 ? 1 : 0
            return {
              ...base,
              rejected: storeRejected,
              ordersUpdated,
              createdRows: toInsert.length,
              updatedRows,
              identicalRows,
            }
          } else {
            const [newOrder] = await db
              .insert(orders)
              .values({ customerId: customer.id, orderDate: periodStart })
              .returning()
            if (!newOrder) return { ...base, rejected: storeRejected }

            const toInsert = content.map((item) => ({
              sku: item.sku,
              quantity: item.quantity,
              netValue: item.netValue,
              upc: item.upc,
              billingDocumentId: newOrder.id,
            }))
            await db.insert(ordersContent).values(toInsert)
            return { ...base, rejected: storeRejected, ordersCreated: 1, createdRows: toInsert.length }
          }
        }),
      )

      const weekTotals = storeResults.reduce(
        (acc, r) => {
          acc.ordersCreated += r.ordersCreated
          acc.ordersUpdated += r.ordersUpdated
          acc.createdRows += r.createdRows
          acc.updatedRows += r.updatedRows
          acc.identicalRows += r.identicalRows
          acc.rejected.push(...r.rejected)
          if (r.invalidCustomer) acc.invalidCustomerIds.push(r.invalidCustomer)
          return acc
        },
        {
          ordersCreated: 0,
          ordersUpdated: 0,
          createdRows: 0,
          updatedRows: 0,
          identicalRows: 0,
          rejected: [] as string[],
          invalidCustomerIds: [] as { id: string; rows: number[] }[],
        },
      )

      return { dataImportId: dataImport.id, ...weekTotals }
    }),
  )

  const totals = weekResults.reduce(
    (acc, r) => {
      acc.ordersCreated += r.ordersCreated
      acc.ordersUpdated += r.ordersUpdated
      acc.createdRows += r.createdRows
      acc.updatedRows += r.updatedRows
      acc.identicalRows += r.identicalRows
      acc.rejected.push(...r.rejected)
      acc.invalidCustomerIds.push(...r.invalidCustomerIds)
      acc.lastDataImportId = r.dataImportId
      return acc
    },
    {
      ordersCreated: 0,
      ordersUpdated: 0,
      createdRows: 0,
      updatedRows: 0,
      identicalRows: 0,
      rejected: initialRejected,
      invalidCustomerIds: [] as { id: string; rows: number[] }[],
      lastDataImportId: 0,
    },
  )

  totals.rejected.push(...buildInvalidCustomerErrors(totals.invalidCustomerIds))

  return {
    received: receivedRows.length,
    ordersCreated: totals.ordersCreated,
    ordersUpdated: totals.ordersUpdated,
    createdRows: totals.createdRows,
    updatedRows: totals.updatedRows,
    deletedRows: 0,
    identicalRows: totals.identicalRows,
    rejected: totals.rejected,
    dataImportId: totals.lastDataImportId,
  }
}

// ─── Sobeys ───────────────────────────────────────────────────────────────────

const BANNER_SOBEYS = 'Sobeys'

export const REPORT_TYPE_SOBEYS = 'SOBEYS'

async function getSobeysCustomers() {
  return db
    .select()
    .from(customers)
    .where(like(customers.banner, `%${BANNER_SOBEYS}%`))
}

async function getSobeysUpcData() {
  return db
    .select({ customerUpc: customersUpc.customerUpc, sku: customersUpc.sku })
    .from(customersUpc)
    .where(eq(customersUpc.banner, BANNER_SOBEYS))
}

export type SobeysProcessResult = NapOrangeProcessResult

export async function processSobeysFile(buffer: Buffer): Promise<SobeysProcessResult> {
  const contentBySheet = await readExcelFile({
    stream: bufferToStream(buffer),
    expected: [
      {
        sheetName: 'DATA',
        columns: [
          'Site',
          'Name',
          'Fiscal Week',
          'Article',
          'SKU',
          'Net contents',
          'UNITS',
          'GSR',
          'Banner2',
          'Region',
          'Week Ending',
          'ERP',
          'Owner',
          'Province',
          'BAM',
          'TM',
        ],
      },
    ],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName === 'DATA')
  if (!reportData) throw Object.assign(new Error('Missing expected DATA sheet.'), { code: 406 })

  const receivedRows = reportData.values
  const INVALID_DATE = 'INVALID_DATE'

  const rowsByWeek = new Map<string, typeof receivedRows>()
  for (const row of receivedRows) {
    const dateVal = row['weekEnding']
    if (!dateVal) {
      const bucket = rowsByWeek.get(INVALID_DATE) ?? []
      bucket.push(row)
      rowsByWeek.set(INVALID_DATE, bucket)
      continue
    }
    const weekKey = format(startOfISOWeek(new Date(String(dateVal))), 'yyyy-MM-dd')
    const bucket = rowsByWeek.get(weekKey) ?? []
    bucket.push(row)
    rowsByWeek.set(weekKey, bucket)
  }

  const [sobeysCustomers, sobeysUpcs] = await Promise.all([getSobeysCustomers(), getSobeysUpcData()])

  const customerByBannerInternalId = new Map(sobeysCustomers.map((c) => [c.bannerInternalId, c]))
  const upcByCustomerUpc = new Map(sobeysUpcs.map((p) => [p.customerUpc, p]))
  const customerIds = sobeysCustomers.map((c) => c.id)

  const invalidDateRows = rowsByWeek.get(INVALID_DATE)
  const initialRejected: string[] = invalidDateRows
    ? [ERRORS.custom(invalidDateRows.map((r) => r['rowNumber'] as number).join(', '), 'Invalid date provided')]
    : []

  const validWeeks = [...rowsByWeek.entries()].filter(([key]) => key !== INVALID_DATE)

  const weekResults = await Promise.all(
    validWeeks.map(async ([weekKey, weekRows]) => {
      const periodStartDate = new Date(weekKey + 'T00:00:00Z')
      const periodStart = format(periodStartDate, 'yyyy-MM-dd')
      const periodEnd = format(endOfISOWeek(periodStartDate), 'yyyy-MM-dd')
      const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_GENERIC)

      const dataImport = await getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_SOBEYS)

      const existingOrderRows = customerIds.length
        ? await db
            .select()
            .from(orders)
            .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
        : []

      const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))

      const existingOrderIds = existingOrderRows.map((o) => o.id)
      const existingContentRows = existingOrderIds.length
        ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
        : []

      const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
      for (const row of existingContentRows) {
        let upcMap = existingContentByOrderId.get(row.billingDocumentId)
        if (!upcMap) {
          upcMap = new Map()
          existingContentByOrderId.set(row.billingDocumentId, upcMap)
        }
        upcMap.set(row.upc, row)
      }

      // Group by site (bannerInternalId)
      const bySite = new Map<string, typeof weekRows>()
      for (const row of weekRows) {
        const site = String(row['site'] ?? '')
        const bucket = bySite.get(site) ?? []
        bucket.push(row)
        bySite.set(site, bucket)
      }

      const storeResults = await Promise.all(
        [...bySite.entries()].map(async ([site, storeRows]) => {
          const base = {
            ordersCreated: 0,
            ordersUpdated: 0,
            createdRows: 0,
            updatedRows: 0,
            identicalRows: 0,
            rejected: [] as string[],
            invalidCustomer: null as { id: string; rows: number[] } | null,
          }

          const customer = customerByBannerInternalId.get(site)
          if (!customer)
            return { ...base, invalidCustomer: { id: site, rows: storeRows.map((r) => r['rowNumber'] as number) } }

          const content: { sku: string; quantity: number; netValue: number; upc: string }[] = []
          const storeRejected: string[] = []

          for (const storeRow of storeRows) {
            const quantity = Number(storeRow['units'] ?? 0)
            if (!quantity || quantity === 0) continue

            const article = String(storeRow['article'] ?? '')
            const linkedProduct = upcByCustomerUpc.get(article)
            if (!linkedProduct || !linkedProduct.sku) {
              storeRejected.push(
                ERRORS.custom(storeRow['rowNumber'] as number, `Could not map Article "${article}" to a product`),
              )
              continue
            }

            content.push({
              sku: linkedProduct.sku,
              quantity,
              netValue: Number(storeRow['gsr']) || 0,
              upc: String(storeRow['sku'] ?? ''),
            })
          }

          if (content.length === 0) return { ...base, rejected: storeRejected }

          const existingOrder = orderByCustomerId.get(customer.id)

          if (existingOrder) {
            const existingUpcMap = existingContentByOrderId.get(existingOrder.id)
            const toInsert: (typeof ordersContent.$inferInsert)[] = []
            const toUpdate: Promise<unknown>[] = []
            let updatedRows = 0
            let identicalRows = 0

            for (const item of content) {
              const existing = existingUpcMap?.get(item.upc)
              if (existing) {
                if (existing.quantity !== item.quantity) {
                  toUpdate.push(
                    db.update(ordersContent).set({ quantity: item.quantity }).where(eq(ordersContent.id, existing.id)),
                  )
                  updatedRows++
                } else {
                  identicalRows++
                }
              } else {
                toInsert.push({
                  sku: item.sku,
                  quantity: item.quantity,
                  netValue: item.netValue,
                  upc: item.upc,
                  billingDocumentId: existingOrder.id,
                })
              }
            }

            await Promise.all([toInsert.length ? db.insert(ordersContent).values(toInsert) : null, ...toUpdate])
            const ordersUpdated = toInsert.length > 0 || toUpdate.length > 0 ? 1 : 0
            return {
              ...base,
              rejected: storeRejected,
              ordersUpdated,
              createdRows: toInsert.length,
              updatedRows,
              identicalRows,
            }
          } else {
            const [newOrder] = await db
              .insert(orders)
              .values({ customerId: customer.id, orderDate: periodStart })
              .returning()
            if (!newOrder) return { ...base, rejected: storeRejected }

            const toInsert = content.map((item) => ({
              sku: item.sku,
              quantity: item.quantity,
              netValue: item.netValue,
              upc: item.upc,
              billingDocumentId: newOrder.id,
            }))
            await db.insert(ordersContent).values(toInsert)
            return { ...base, rejected: storeRejected, ordersCreated: 1, createdRows: toInsert.length }
          }
        }),
      )

      const weekTotals = storeResults.reduce(
        (acc, r) => {
          acc.ordersCreated += r.ordersCreated
          acc.ordersUpdated = Math.max(acc.ordersUpdated, r.ordersUpdated)
          acc.createdRows += r.createdRows
          acc.updatedRows += r.updatedRows
          acc.identicalRows += r.identicalRows
          acc.rejected.push(...r.rejected)
          if (r.invalidCustomer) acc.invalidCustomerIds.push(r.invalidCustomer)
          return acc
        },
        {
          ordersCreated: 0,
          ordersUpdated: 0,
          createdRows: 0,
          updatedRows: 0,
          identicalRows: 0,
          rejected: [] as string[],
          invalidCustomerIds: [] as { id: string; rows: number[] }[],
        },
      )

      return { dataImportId: dataImport.id, ...weekTotals }
    }),
  )

  const totals = weekResults.reduce(
    (acc, r) => {
      acc.ordersCreated += r.ordersCreated
      acc.ordersUpdated = Math.max(acc.ordersUpdated, r.ordersUpdated)
      acc.createdRows += r.createdRows
      acc.updatedRows += r.updatedRows
      acc.identicalRows += r.identicalRows
      acc.rejected.push(...r.rejected)
      acc.invalidCustomerIds.push(...r.invalidCustomerIds)
      acc.lastDataImportId = r.dataImportId
      return acc
    },
    {
      ordersCreated: 0,
      ordersUpdated: 0,
      createdRows: 0,
      updatedRows: 0,
      identicalRows: 0,
      rejected: initialRejected,
      invalidCustomerIds: [] as { id: string; rows: number[] }[],
      lastDataImportId: 0,
    },
  )

  totals.rejected.push(...buildInvalidCustomerErrors(totals.invalidCustomerIds))

  return {
    received: receivedRows.length,
    ordersCreated: totals.ordersCreated,
    ordersUpdated: totals.ordersUpdated,
    createdRows: totals.createdRows,
    updatedRows: totals.updatedRows,
    deletedRows: 0,
    identicalRows: totals.identicalRows,
    rejected: totals.rejected,
    dataImportId: totals.lastDataImportId,
  }
}

// ─── Central Market ───────────────────────────────────────────────────────────

const BANNER_CENTRAL_MARKET = 'Central Market'

export const REPORT_TYPE_CENTRAL_MARKET = 'CENTRAL_MARKET'

export type CentralMarketProcessResult = NapOrangeProcessResult

export async function processCentralMarketFile(buffer: Buffer): Promise<CentralMarketProcessResult> {
  const contentBySheet = await readExcelFile({
    stream: bufferToStream(buffer),
    expected: [{ sheetName: 'Data', columns: ['SKU', 'ID', 'Quantity', 'Net Value', 'Date'] }],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName.includes('Data'))
  if (!reportData) throw Object.assign(new Error('Missing weekly report data.'), { code: 406 })

  const dataRows = reportData.values.map((rd) => ({
    rowNumber: rd['rowNumber'] as number,
    id: String(rd['id'] ?? ''),
    sku: String(rd['sku'] ?? ''),
    quantity: Number(rd['quantity'] ?? 0),
    netValue: Number(rd['netValue'] ?? 0),
    date: format(new Date(String(rd['date'])), 'yyyy-MM-dd'),
  }))

  // Validate all rows share the same date
  const uniqueDates = new Set(dataRows.map((r) => r.date))
  if (uniqueDates.size !== 1) throw Object.assign(new Error('All dates should be the same.'), { code: 406 })

  const importedDate = [...uniqueDates][0]!
  const importedDateObj = new Date(importedDate + 'T00:00:00Z')
  const periodStart = format(startOfMonth(importedDateObj), 'yyyy-MM-dd')
  const periodEnd = format(endOfMonth(importedDateObj), 'yyyy-MM-dd')
  const rydeWeek = differenceInWeeks(startOfISOWeek(importedDateObj), RYDE_WEEK_0_GENERIC)

  const [centralMarketCustomers, availableSkus, dataImport] = await Promise.all([
    db.select().from(customers).where(eq(customers.banner, BANNER_CENTRAL_MARKET)),
    db.select({ sku: productSkus.sku }).from(productSkus),
    getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_CENTRAL_MARKET),
  ])

  const customerByBannerInternalId = new Map(centralMarketCustomers.map((c) => [c.bannerInternalId, c]))
  const validSkus = new Set(availableSkus.map((s) => s.sku))
  const customerIds = centralMarketCustomers.map((c) => c.id)

  // Group rows by customer, aggregate quantities per SKU
  const customerOrders = new Map<number, Map<string, { quantity: number; netValue: number }>>()
  const rejected: string[] = []

  for (const row of dataRows) {
    const { rowNumber: rowNum, id, sku, quantity, netValue } = row

    const customer = customerByBannerInternalId.get(id)
    if (!customer) {
      rejected.push(ERRORS.invalidSiteNumber(rowNum, id))
      continue
    }

    if (quantity === 0) {
      rejected.push(ERRORS.invalidQuantity(rowNum, quantity))
      continue
    }

    if (!validSkus.has(sku)) {
      rejected.push(ERRORS.invalidSKU(rowNum, sku))
      continue
    }

    const skuMap = customerOrders.get(customer.id) ?? new Map()
    const existing = skuMap.get(sku)
    if (existing) {
      existing.quantity += quantity
      existing.netValue += netValue
    } else {
      skuMap.set(sku, { quantity, netValue })
    }
    customerOrders.set(customer.id, skuMap)
  }

  // Batch-fetch existing orders and content
  const existingOrderRows = customerIds.length
    ? await db
        .select()
        .from(orders)
        .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
    : []

  const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))
  const existingOrderIds = existingOrderRows.map((o) => o.id)
  const existingContentRows = existingOrderIds.length
    ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
    : []

  const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
  for (const row of existingContentRows) {
    let skuMap = existingContentByOrderId.get(row.billingDocumentId)
    if (!skuMap) {
      skuMap = new Map()
      existingContentByOrderId.set(row.billingDocumentId, skuMap)
    }
    skuMap.set(row.sku, row)
  }

  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0

  // Track which existing orders are still referenced
  const referencedOrderIds = new Set<number>()

  for (const [customerId, skuMap] of customerOrders.entries()) {
    const existingOrder = orderByCustomerId.get(customerId)

    if (existingOrder) {
      referencedOrderIds.add(existingOrder.id)
      const existingSkuMap = existingContentByOrderId.get(existingOrder.id)
      const toInsert: (typeof ordersContent.$inferInsert)[] = []
      const toUpdate: Promise<unknown>[] = []
      const incomingSkus = new Set<string | null>()

      for (const [sku, { quantity, netValue }] of skuMap.entries()) {
        incomingSkus.add(sku)
        const existingRow = existingSkuMap?.get(sku)
        if (existingRow) {
          if (existingRow.quantity !== quantity || existingRow.netValue !== netValue) {
            toUpdate.push(
              db.update(ordersContent).set({ quantity, netValue }).where(eq(ordersContent.id, existingRow.id)),
            )
            updatedRows++
            ordersUpdated++
          } else {
            identicalRows++
          }
        } else {
          toInsert.push({ sku, quantity, netValue, billingDocumentId: existingOrder.id })
          createdRows++
          ordersUpdated++
        }
      }

      // Delete content rows no longer in file
      if (existingSkuMap) {
        const toDeleteIds: number[] = []
        for (const [existingSku, existingRow] of existingSkuMap.entries()) {
          if (!incomingSkus.has(existingSku)) toDeleteIds.push(existingRow.id)
        }
        if (toDeleteIds.length) {
          await db.delete(ordersContent).where(inArray(ordersContent.id, toDeleteIds))
          deletedRows += toDeleteIds.length
        }
      }

      await Promise.all([toInsert.length ? db.insert(ordersContent).values(toInsert) : null, ...toUpdate])
    } else {
      const content = Array.from(skuMap.entries()).map(([sku, { quantity, netValue }]) => ({ sku, quantity, netValue }))
      if (content.length > 0) {
        const [newOrder] = await db.insert(orders).values({ customerId, orderDate: periodStart }).returning()
        if (newOrder) {
          ordersCreated++
          const toInsert = content.map((item) => ({
            sku: item.sku,
            quantity: item.quantity,
            netValue: item.netValue,
            billingDocumentId: newOrder.id,
          }))
          await db.insert(ordersContent).values(toInsert)
          createdRows += toInsert.length
        }
      }
    }
  }

  // Delete orders no longer referenced
  for (const existingOrder of existingOrderRows) {
    if (!referencedOrderIds.has(existingOrder.id) && !customerOrders.has(existingOrder.id)) {
      const contentToDelete = existingContentByOrderId.get(existingOrder.id)
      if (contentToDelete && contentToDelete.size > 0) {
        await db.delete(ordersContent).where(eq(ordersContent.billingDocumentId, existingOrder.id))
        deletedRows += contentToDelete.size
      }
      const remainingContent = await db
        .select()
        .from(ordersContent)
        .where(eq(ordersContent.billingDocumentId, existingOrder.id))
        .limit(1)
      if (remainingContent.length === 0) {
        await db.delete(orders).where(eq(orders.id, existingOrder.id))
      }
    }
  }

  // Competitor sales — aggregate order totals per customer
  const customerMonthlySales = await db
    .select({
      customerId: orders.customerId,
      quantity: sql<number>`sum(${ordersContent.quantity})`,
      netValue: sql<number>`sum(${ordersContent.netValue})`,
    })
    .from(orders)
    .innerJoin(ordersContent, eq(orders.id, ordersContent.billingDocumentId))
    .where(eq(orders.orderDate, periodStart))
    .groupBy(orders.customerId)

  const existingCompSales = await db.select().from(competitorSales).where(eq(competitorSales.fileImport, dataImport.id))
  const compByCustomerId = new Map(existingCompSales.map((cs) => [cs.customerId, cs]))

  for (const { customerId, quantity, netValue } of customerMonthlySales) {
    const existingComp = compByCustomerId.get(customerId)
    const compData = {
      customerId,
      rydeUnits: Number(quantity),
      rydeValue: Number(netValue),
      romUnits: 0,
      romValue: 0,
      fileImport: dataImport.id,
    }

    if (existingComp) {
      if (existingComp.rydeUnits !== compData.rydeUnits || existingComp.rydeValue !== compData.rydeValue) {
        await db.update(competitorSales).set(compData).where(eq(competitorSales.id, existingComp.id))
      }
    } else {
      await db.insert(competitorSales).values(compData)
    }
  }

  return {
    received: dataRows.length,
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

// ─── Loblaws ──────────────────────────────────────────────────────────────────

const BANNER_LOBLAWS = 'LCL'

export const REPORT_TYPE_LOBLAWS = 'LOBLAWS'

async function getLoblawsCustomers() {
  return db.select().from(customers).where(eq(customers.banner, BANNER_LOBLAWS))
}

async function getLoblawsUpcData() {
  return db
    .select({
      customerUpc: customersUpc.customerUpc,
      sku: customersUpc.sku,
      packSize: productFormats.numerator,
    })
    .from(customersUpc)
    .innerJoin(productFormats, eq(productFormats.id, customersUpc.formatId))
    .where(eq(customersUpc.banner, BANNER_LOBLAWS))
}

export type LoblawsProcessResult = NapOrangeProcessResult

export async function processLoblawsFile(buffer: Buffer): Promise<LoblawsProcessResult> {
  const fileContent = buffer.toString('utf-8')
  const rawRows = parseLoblawsCsv(fileContent).filter((r) => r['weekEndDate'] !== '')

  if (rawRows.length === 0) throw Object.assign(new Error('File is empty.'), { code: 406 })

  const [loblawsCustomers, loblawsUpcs] = await Promise.all([getLoblawsCustomers(), getLoblawsUpcData()])

  const customerByBannerInternalId = new Map(loblawsCustomers.map((c) => [c.bannerInternalId, c]))
  const upcByCustomerUpc = new Map(loblawsUpcs.map((p) => [p.customerUpc, p]))
  const customerIds = loblawsCustomers.map((c) => c.id)

  // Group by week
  const rowsByWeek = new Map<string, typeof rawRows>()
  for (const row of rawRows) {
    const weekEndDate = String(row['weekEndDate'] ?? '')
    const weekKey = format(startOfISOWeek(new Date(weekEndDate)), 'yyyy-MM-dd')
    const bucket = rowsByWeek.get(weekKey) ?? []
    bucket.push(row)
    rowsByWeek.set(weekKey, bucket)
  }

  const weekResults = await Promise.all(
    [...rowsByWeek.entries()].map(async ([weekKey, weekRows]) => {
      const periodStartDate = new Date(weekKey + 'T00:00:00Z')
      const periodStart = format(periodStartDate, 'yyyy-MM-dd')
      const periodEnd = format(endOfISOWeek(periodStartDate), 'yyyy-MM-dd')
      const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_GENERIC)

      const dataImport = await getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_LOBLAWS)

      const existingOrderRows = customerIds.length
        ? await db
            .select()
            .from(orders)
            .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
        : []

      const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))
      const existingOrderIds = existingOrderRows.map((o) => o.id)
      const existingContentRows = existingOrderIds.length
        ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
        : []

      const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
      for (const row of existingContentRows) {
        let skuMap = existingContentByOrderId.get(row.billingDocumentId)
        if (!skuMap) {
          skuMap = new Map()
          existingContentByOrderId.set(row.billingDocumentId, skuMap)
        }
        skuMap.set(row.sku, row)
      }

      // Existing competitor sales for this week
      const existingCompSales = await db
        .select()
        .from(competitorSales)
        .where(eq(competitorSales.fileImport, dataImport.id))
      const compByCustomerId = new Map(existingCompSales.map((cs) => [cs.customerId, cs]))

      // Group by site number
      const bySite = new Map<string, typeof weekRows>()
      for (const row of weekRows) {
        const siteNumber = String(row['siteNumber'] ?? '')
        const bucket = bySite.get(siteNumber) ?? []
        bucket.push(row)
        bySite.set(siteNumber, bucket)
      }

      let ordersCreated = 0
      let ordersUpdated = 0
      let createdRows = 0
      let updatedRows = 0
      let deletedRows = 0
      let identicalRows = 0
      const rejected: string[] = []

      for (const [siteNumber, siteRows] of bySite.entries()) {
        const customer = customerByBannerInternalId.get(siteNumber)
        if (!customer) {
          rejected.push(ERRORS.invalidSiteNumber(siteRows.map((r) => r['rowNumber']).join(', '), siteNumber))
          continue
        }

        const content: { sku: string; quantity: number; netValue: number; upc: string; packSize: number }[] = []

        for (const siteRow of siteRows) {
          const rowNum = siteRow['rowNumber'] as number
          const quantity = Number(siteRow['units'] ?? 0)
          const netValue = Number(siteRow['sales'] ?? 0)
          const productUpc = String(siteRow['upc'] ?? '')

          if (quantity === 0) {
            rejected.push(ERRORS.invalidQuantity(rowNum, quantity))
            continue
          }

          if (netValue === 0) {
            rejected.push(ERRORS.custom(rowNum, `Invalid quantity: ${netValue}. Must be greater than 0.`))
            continue
          }

          const linked = upcByCustomerUpc.get(productUpc)
          if (!linked || !linked.sku) {
            rejected.push(ERRORS.invalidUPC(rowNum, productUpc))
            continue
          }

          content.push({ sku: linked.sku, quantity, netValue, upc: productUpc, packSize: linked.packSize ?? 1 })
        }

        if (content.length === 0) continue

        const existingOrder = orderByCustomerId.get(customer.id)

        if (existingOrder) {
          const existingSkuMap = existingContentByOrderId.get(existingOrder.id)
          let orderIsUpdated = false

          for (const item of content) {
            const totalUnits = item.quantity * item.packSize
            const existingRow = existingSkuMap?.get(item.sku)

            if (existingRow) {
              if (existingRow.quantity !== totalUnits || existingRow.netValue !== item.netValue) {
                await db
                  .update(ordersContent)
                  .set({ quantity: totalUnits, netValue: item.netValue })
                  .where(eq(ordersContent.id, existingRow.id))
                updatedRows++
                orderIsUpdated = true
              } else {
                identicalRows++
              }
            } else {
              await db.insert(ordersContent).values({
                sku: item.sku,
                quantity: totalUnits,
                netValue: item.netValue,
                upc: item.upc,
                billingDocumentId: existingOrder.id,
              })
              createdRows++
              orderIsUpdated = true
            }
          }

          // Delete content rows for SKUs no longer present
          const incomingSkus = new Set(content.map((c) => c.sku as string | null))
          if (existingSkuMap) {
            const toDeleteIds: number[] = []
            for (const [existingSku, existingRow] of existingSkuMap.entries()) {
              if (!incomingSkus.has(existingSku)) toDeleteIds.push(existingRow.id)
            }
            if (toDeleteIds.length) {
              await db.delete(ordersContent).where(inArray(ordersContent.id, toDeleteIds))
              deletedRows += toDeleteIds.length
            }
          }

          if (orderIsUpdated) ordersUpdated++
        } else {
          const [newOrder] = await db
            .insert(orders)
            .values({ customerId: customer.id, orderDate: periodStart })
            .returning()
          if (!newOrder) continue
          ordersCreated++

          for (const item of content) {
            await db.insert(ordersContent).values({
              sku: item.sku,
              quantity: item.quantity * item.packSize,
              netValue: item.netValue,
              upc: item.upc,
              billingDocumentId: newOrder.id,
            })
            createdRows++
          }
        }

        // Competitor sales per customer
        const compData = {
          customerId: customer.id,
          rydeUnits: content.reduce((sum, c) => sum + c.quantity * c.packSize, 0),
          rydeValue: round(
            content.reduce((sum, c) => sum + c.netValue, 0),
            2,
          ),
          romUnits: 0,
          romValue: 0,
          fileImport: dataImport.id,
        }

        const existingComp = compByCustomerId.get(customer.id)
        if (existingComp) {
          await db.update(competitorSales).set(compData).where(eq(competitorSales.id, existingComp.id))
        } else {
          await db.insert(competitorSales).values(compData)
        }
      }

      // Delete orders no longer referenced in this week
      const referencedCustomerIds = new Set(
        [...bySite.keys()].map((site) => customerByBannerInternalId.get(site)?.id).filter(Boolean) as number[],
      )
      for (const existingOrder of existingOrderRows) {
        if (!referencedCustomerIds.has(existingOrder.customerId)) {
          const contentToDelete = existingContentByOrderId.get(existingOrder.id)
          if (contentToDelete && contentToDelete.size > 0) {
            await db.delete(ordersContent).where(eq(ordersContent.billingDocumentId, existingOrder.id))
            deletedRows += contentToDelete.size
          }
          await db.delete(orders).where(eq(orders.id, existingOrder.id))
        }
      }

      return {
        dataImportId: dataImport.id,
        ordersCreated,
        ordersUpdated,
        createdRows,
        updatedRows,
        deletedRows,
        identicalRows,
        rejected,
      }
    }),
  )

  const totals = weekResults.reduce(
    (acc, r) => {
      acc.ordersCreated += r.ordersCreated
      acc.ordersUpdated += r.ordersUpdated
      acc.createdRows += r.createdRows
      acc.updatedRows += r.updatedRows
      acc.deletedRows += r.deletedRows
      acc.identicalRows += r.identicalRows
      acc.rejected.push(...r.rejected)
      acc.lastDataImportId = r.dataImportId
      return acc
    },
    {
      ordersCreated: 0,
      ordersUpdated: 0,
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [] as string[],
      lastDataImportId: 0,
    },
  )

  return { received: rawRows.length, ...totals, dataImportId: totals.lastDataImportId }
}

// ─── 7-Eleven ─────────────────────────────────────────────────────────────────

const BANNER_SEVEN_ELEVEN = '7-Eleven'

export const REPORT_TYPE_SEVEN_ELEVEN = '7_ELEVEN'

async function getSevenElevenCustomers() {
  return db
    .select()
    .from(customers)
    .where(like(customers.banner, `%${BANNER_SEVEN_ELEVEN}%`))
}

async function getSevenElevenUpcData() {
  return db
    .select({ customerUpc: customersUpc.customerUpc, sku: customersUpc.sku })
    .from(customersUpc)
    .where(eq(customersUpc.banner, BANNER_SEVEN_ELEVEN))
}

export type SevenElevenProcessResult = NapOrangeProcessResult

export async function process7ElevenFile(buffer: Buffer): Promise<SevenElevenProcessResult> {
  const { dateRange, salesByCustomer, totalRowsReceived } = await parseSevenElevenWHToStore({
    stream: bufferToStream(buffer),
  })

  if (!salesByCustomer || salesByCustomer.length === 0) {
    throw Object.assign(new Error('No data found in 7-Eleven file.'), { code: 406 })
  }

  const periodStartDate = new Date(dateRange.start + 'T00:00:00Z')
  const periodStart = format(startOfMonth(periodStartDate), 'yyyy-MM-dd')
  const periodEnd = format(endOfMonth(periodStartDate), 'yyyy-MM-dd')
  const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_GENERIC)

  const [sevenElevenCustomers, sevenElevenUpcs, dataImport] = await Promise.all([
    getSevenElevenCustomers(),
    getSevenElevenUpcData(),
    getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_SEVEN_ELEVEN),
  ])

  const customerByBannerInternalId = new Map(sevenElevenCustomers.map((c) => [c.bannerInternalId, c]))
  const upcByCustomerUpc = new Map(sevenElevenUpcs.map((p) => [p.customerUpc, p]))
  const customerIds = sevenElevenCustomers.map((c) => c.id)

  // Fetch existing orders and content
  const existingOrderRows = customerIds.length
    ? await db
        .select()
        .from(orders)
        .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
    : []

  const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))
  const existingOrderIds = existingOrderRows.map((o) => o.id)
  const existingContentRows = existingOrderIds.length
    ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
    : []

  const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
  for (const row of existingContentRows) {
    let upcMap = existingContentByOrderId.get(row.billingDocumentId)
    if (!upcMap) {
      upcMap = new Map()
      existingContentByOrderId.set(row.billingDocumentId, upcMap)
    }
    upcMap.set(row.upc, row)
  }

  // Existing competitor sales
  const existingCompSales = await db.select().from(competitorSales).where(eq(competitorSales.fileImport, dataImport.id))
  const compByCustomerId = new Map(existingCompSales.map((cs) => [cs.customerId, cs]))

  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0
  const rejected: string[] = []

  for (const { customerId: storeId, products } of salesByCustomer) {
    const customer = customerByBannerInternalId.get(storeId)
    if (!customer) {
      rejected.push(ERRORS.invalidSiteNumber(`[${products.map((p) => p.rowNumber).join(', ')}]`, storeId))
      continue
    }

    const content: { sku: string; quantity: number; netValue: number; upc: string }[] = []
    let rydeUnits = 0
    let rydeSales = 0

    for (const product of products) {
      const linked = product.upc ? upcByCustomerUpc.get(product.upc) : null
      if (!linked || !linked.sku) {
        if (product.upc) rejected.push(ERRORS.invalidUPC(`[${product.rowNumber}]`, product.upc))
        continue
      }

      content.push({ sku: linked.sku, quantity: product.quantity, netValue: product.amount, upc: product.upc! })
      rydeUnits += product.quantity
      rydeSales += product.amount
    }

    // Orders
    const existingOrder = orderByCustomerId.get(customer.id)

    if (existingOrder) {
      const existingUpcMap = existingContentByOrderId.get(existingOrder.id)
      let orderWasUpdated = false
      for (const item of content) {
        const existing = existingUpcMap?.get(item.upc)
        if (existing) {
          if (existing.quantity !== item.quantity || existing.netValue !== item.netValue) {
            await db
              .update(ordersContent)
              .set({ quantity: item.quantity, netValue: item.netValue })
              .where(eq(ordersContent.id, existing.id))
            updatedRows++
            orderWasUpdated = true
          } else {
            identicalRows++
          }
        } else {
          await db.insert(ordersContent).values({
            sku: item.sku,
            quantity: item.quantity,
            netValue: item.netValue,
            upc: item.upc,
            billingDocumentId: existingOrder.id,
          })
          createdRows++
          orderWasUpdated = true
        }
      }
      if (orderWasUpdated) {
        ordersUpdated++
      }
    } else if (content.length > 0) {
      const [newOrder] = await db.insert(orders).values({ customerId: customer.id, orderDate: periodStart }).returning()
      if (newOrder) {
        ordersCreated++
        for (const item of content) {
          await db.insert(ordersContent).values({
            sku: item.sku,
            quantity: item.quantity,
            netValue: item.netValue,
            upc: item.upc,
            billingDocumentId: newOrder.id,
          })
          createdRows++
        }
      }
    }

    // Competitor sales
    const compData = {
      customerId: customer.id,
      rydeUnits,
      rydeValue: round(rydeSales, 2),
      romUnits: 0,
      romValue: 0,
      fileImport: dataImport.id,
    }

    const existingComp = compByCustomerId.get(customer.id)
    if (existingComp) {
      if (
        existingComp.rydeUnits !== compData.rydeUnits ||
        existingComp.rydeValue !== compData.rydeValue ||
        existingComp.romUnits !== compData.romUnits ||
        existingComp.romValue !== compData.romValue
      ) {
        await db.update(competitorSales).set(compData).where(eq(competitorSales.id, existingComp.id))
        updatedRows++
      } else {
        identicalRows++
      }
    } else {
      await db.insert(competitorSales).values(compData)
      createdRows++
    }
  }

  return {
    received: totalRowsReceived,
    ordersCreated,
    ordersUpdated,
    rejected,
    createdRows,
    updatedRows,
    deletedRows: 0,
    identicalRows,
    dataImportId: dataImport.id,
  }
}

// ─── Parkland ─────────────────────────────────────────────────────────────────

const BANNER_PARKLAND = 'Parkland'
const PARKLAND_SINGLE_UNIT_SKUS = ['100131', '100133', '100134']

export const REPORT_TYPE_PARKLAND = 'PARKLAND'

export type ParklandProcessResult = NapOrangeProcessResult

export async function processParklandFile(buffer: Buffer): Promise<ParklandProcessResult> {
  const { data: dateData, totalRowsReceived } = await parseParklandSellOut({ stream: bufferToStream(buffer) })

  if (!dateData || dateData.length === 0) {
    throw Object.assign(new Error('No data found in Parkland file.'), { code: 406 })
  }

  const parklandCustomers = await db.select().from(customers).where(eq(customers.banner, BANNER_PARKLAND))
  const customerByBannerInternalId = new Map(parklandCustomers.map((c) => [c.bannerInternalId, c]))
  const customerIds = parklandCustomers.map((c) => c.id)

  let totalOrdersCreated = 0
  let totalOrdersUpdated = 0
  let totalCreatedRows = 0
  let totalUpdatedRows = 0
  let totalDeletedRows = 0
  let totalIdenticalRows = 0
  const allRejected: string[] = []
  let lastDataImportId = 0

  for (const { date, sales } of dateData) {
    const salesDate = date
    const periodStartDate = new Date(date + 'T00:00:00Z')
    const periodStart = format(startOfISOWeek(periodStartDate), 'yyyy-MM-dd')
    const periodEnd = format(endOfISOWeek(periodStartDate), 'yyyy-MM-dd')
    const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_GENERIC)

    const dataImport = await getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_PARKLAND)
    lastDataImportId = dataImport.id

    // Fetch existing data
    const [existingCompSales, existingCompOrders, existingOrderRows] = await Promise.all([
      db.select().from(competitorSales).where(eq(competitorSales.fileImport, dataImport.id)),
      db
        .select()
        .from(competitorOrders)
        .where(and(eq(competitorOrders.orderDate, salesDate), inArray(competitorOrders.customerId, customerIds))),
      customerIds.length
        ? db
            .select()
            .from(orders)
            .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, salesDate)))
        : Promise.resolve([] as (typeof orders.$inferSelect)[]),
    ])

    const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))
    const compByCustomerId = new Map(existingCompSales.map((cs) => [cs.customerId, cs]))

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

    // Group competitor orders by customer
    const compOrdersByCustomerId = new Map<number, (typeof competitorOrders.$inferSelect)[]>()
    for (const co of existingCompOrders) {
      if (co.customerId == null) continue
      const list = compOrdersByCustomerId.get(co.customerId) ?? []
      list.push(co)
      compOrdersByCustomerId.set(co.customerId, list)
    }

    for (const { id: storeId, lines, ryde, rom } of sales) {
      const customer = customerByBannerInternalId.get(storeId)
      if (!customer) {
        allRejected.push(ERRORS.invalidSiteNumber(`[${lines.join(', ')}]`, storeId))
        continue
      }

      // Distribute units evenly across SKUs
      const totalUnits = ryde.units
      const totalValue = ryde.sales
      const skus = PARKLAND_SINGLE_UNIT_SKUS

      const baseUnits = Math.floor(totalUnits / skus.length)
      const remainder = totalUnits % skus.length

      const content = skus.reduce<{ sku: string; quantity: number; netValue: number }[]>((acc, sku, index) => {
        const quantity = baseUnits + (index < remainder ? 1 : 0)
        if (quantity === 0) return acc
        const netValue = round((quantity / totalUnits) * totalValue, 2)
        return [...acc, { sku, quantity, netValue }]
      }, [])

      const existingOrder = orderByCustomerId.get(customer.id)

      if (existingOrder) {
        const existingContent = existingContentByOrderId.get(existingOrder.id) ?? []
        let hasChanges = false

        for (const item of content) {
          const existingRow = existingContent.find((c) => c.sku === item.sku)
          if (existingRow) {
            if (existingRow.quantity !== item.quantity || existingRow.netValue !== item.netValue) {
              await db
                .update(ordersContent)
                .set({ quantity: item.quantity, netValue: item.netValue })
                .where(eq(ordersContent.id, existingRow.id))
              totalUpdatedRows++
              hasChanges = true
            } else {
              totalIdenticalRows++
            }
          } else {
            await db.insert(ordersContent).values({
              sku: item.sku,
              quantity: item.quantity,
              netValue: item.netValue,
              billingDocumentId: existingOrder.id,
            })
            totalCreatedRows++
            hasChanges = true
          }
        }

        // Delete content for SKUs no longer present
        const incomingSkus = new Set(content.map((c) => c.sku))
        for (const existingRow of existingContent) {
          if (!incomingSkus.has(existingRow.sku ?? '')) {
            await db.delete(ordersContent).where(eq(ordersContent.id, existingRow.id))
            totalDeletedRows++
            hasChanges = true
          }
        }

        if (hasChanges) totalOrdersUpdated++
      } else if (content.length > 0) {
        const [newOrder] = await db.insert(orders).values({ customerId: customer.id, orderDate: salesDate }).returning()
        if (newOrder) {
          totalOrdersCreated++
          for (const item of content) {
            await db.insert(ordersContent).values({
              sku: item.sku,
              quantity: item.quantity,
              netValue: item.netValue,
              billingDocumentId: newOrder.id,
            })
            totalCreatedRows++
          }
        }
      }

      // Competitor orders by brand
      const customerCompOrders = compOrdersByCustomerId.get(customer.id) ?? []
      for (const [brand, brandData] of Object.entries(rom.salesByBrand)) {
        const existingCompOrder = customerCompOrders.find((o) => o.brand === brand)
        if (existingCompOrder) {
          if (
            Number(existingCompOrder.quantity) !== brandData.units ||
            Number(existingCompOrder.value) !== brandData.sales
          ) {
            await db
              .update(competitorOrders)
              .set({ quantity: brandData.units, value: String(round(brandData.sales, 2)) })
              .where(eq(competitorOrders.id, existingCompOrder.id))
            totalUpdatedRows++
          } else {
            totalIdenticalRows++
          }
        } else {
          await db.insert(competitorOrders).values({
            customerId: customer.id,
            brand,
            quantity: brandData.units,
            value: String(round(brandData.sales, 2)),
            orderDate: salesDate,
          })
          totalCreatedRows++
        }
      }

      // Delete competitor orders for brands no longer present
      for (const existingCompOrder of customerCompOrders) {
        if (!rom.salesByBrand[existingCompOrder.brand ?? '']) {
          await db.delete(competitorOrders).where(eq(competitorOrders.id, existingCompOrder.id))
          totalDeletedRows++
        }
      }

      // Competitor sales aggregate
      const existingComp = compByCustomerId.get(customer.id)
      const compData = {
        customerId: customer.id,
        rydeUnits: ryde.units,
        rydeValue: round(ryde.sales, 2),
        romUnits: rom.units,
        romValue: round(rom.sales, 2),
        fileImport: dataImport.id,
      }

      if (existingComp) {
        if (
          existingComp.rydeUnits !== compData.rydeUnits ||
          existingComp.rydeValue !== compData.rydeValue ||
          existingComp.romUnits !== compData.romUnits ||
          existingComp.romValue !== compData.romValue
        ) {
          await db.update(competitorSales).set(compData).where(eq(competitorSales.id, existingComp.id))
          totalUpdatedRows++
        } else {
          totalIdenticalRows++
        }
      } else {
        await db.insert(competitorSales).values(compData)
        totalCreatedRows++
      }
    }
  }

  return {
    received: totalRowsReceived,
    ordersCreated: totalOrdersCreated,
    ordersUpdated: totalOrdersUpdated,
    rejected: [...new Set(allRejected)],
    createdRows: totalCreatedRows,
    updatedRows: totalUpdatedRows,
    deletedRows: totalDeletedRows,
    identicalRows: totalIdenticalRows,
    dataImportId: lastDataImportId,
  }
}

// ─── Petro Canada ─────────────────────────────────────────────────────────────

const BANNER_PETRO_CANADA = 'Petro Canada'

export const REPORT_TYPE_PETRO_CANADA = 'PETRO_CANADA'

async function getPetroCanadaUpcData() {
  return db
    .select({ customerUpc: customersUpc.customerUpc, sku: customersUpc.sku })
    .from(customersUpc)
    .where(eq(customersUpc.banner, BANNER_PETRO_CANADA))
}

export type PetroCanadaProcessResult = NapOrangeProcessResult

export async function processPetroCanadaFile(buffer: Buffer): Promise<PetroCanadaProcessResult> {
  const { data: dateData, totalRowsReceived } = await parsePetroCanadaSellOut({ stream: bufferToStream(buffer) })

  if (!dateData || dateData.length === 0) {
    throw Object.assign(new Error('No data found in Petro Canada file.'), { code: 406 })
  }

  const [petroCanadaCustomers, petroCanadaUpcs] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(like(customers.banner, `%${BANNER_PETRO_CANADA}%`)),
    getPetroCanadaUpcData(),
  ])

  const customerByBannerInternalId = new Map(petroCanadaCustomers.map((c) => [c.bannerInternalId, c]))
  const upcByCustomerUpc = new Map(petroCanadaUpcs.map((p) => [p.customerUpc, p]))
  const customerIds = petroCanadaCustomers.map((c) => c.id)

  let totalOrdersCreated = 0
  let totalOrdersUpdated = 0
  let totalCreatedRows = 0
  let totalUpdatedRows = 0
  let totalDeletedRows = 0
  let totalIdenticalRows = 0
  const allRejected: string[] = []
  let lastDataImportId = 0

  for (const { date, sales } of dateData) {
    const salesDate = date
    const periodStartDate = new Date(date + 'T00:00:00Z')
    const periodStart = format(startOfISOWeek(periodStartDate), 'yyyy-MM-dd')
    const periodEnd = format(endOfISOWeek(periodStartDate), 'yyyy-MM-dd')
    const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_GENERIC)

    const dataImport = await getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_PETRO_CANADA)
    lastDataImportId = dataImport.id

    const [existingCompSales, existingCompOrders, existingOrderRows] = await Promise.all([
      db.select().from(competitorSales).where(eq(competitorSales.fileImport, dataImport.id)),
      db
        .select()
        .from(competitorOrders)
        .where(and(eq(competitorOrders.orderDate, salesDate), inArray(competitorOrders.customerId, customerIds))),
      customerIds.length
        ? db
            .select()
            .from(orders)
            .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, salesDate)))
        : Promise.resolve([] as (typeof orders.$inferSelect)[]),
    ])

    const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))
    const compByCustomerId = new Map(existingCompSales.map((cs) => [cs.customerId, cs]))

    const existingOrderIds = existingOrderRows.map((o) => o.id)
    const existingContentRows = existingOrderIds.length
      ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
      : []

    const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
    for (const row of existingContentRows) {
      let upcMap = existingContentByOrderId.get(row.billingDocumentId)
      if (!upcMap) {
        upcMap = new Map()
        existingContentByOrderId.set(row.billingDocumentId, upcMap)
      }
      upcMap.set(row.upc, row)
    }

    const compOrdersByCustomerId = new Map<number, (typeof competitorOrders.$inferSelect)[]>()
    for (const co of existingCompOrders) {
      if (co.customerId == null) continue
      const list = compOrdersByCustomerId.get(co.customerId) ?? []
      list.push(co)
      compOrdersByCustomerId.set(co.customerId, list)
    }

    for (const { id: storeId, lines, ryde, rom } of sales) {
      const customer = customerByBannerInternalId.get(storeId)
      if (!customer) {
        allRejected.push(ERRORS.invalidSiteNumber(`[${lines.join(', ')}]`, storeId))
        continue
      }

      // Map byUpc to content using customersUpc
      const content: { sku: string; quantity: number; netValue: number; upc: string }[] = []
      for (const [upc, { units, sales: upcSales }] of Object.entries(ryde.byUpc)) {
        const linked = upcByCustomerUpc.get(upc)
        if (!linked || !linked.sku) {
          allRejected.push(ERRORS.invalidUPC(`[${lines.join(', ')}]`, upc))
          continue
        }
        content.push({ sku: linked.sku, quantity: units, netValue: upcSales, upc })
      }

      const existingOrder = orderByCustomerId.get(customer.id)

      if (existingOrder) {
        if (content.length > 0) {
          const existingUpcMap = existingContentByOrderId.get(existingOrder.id)
          let orderWasUpdated = false
          for (const item of content) {
            const existing = existingUpcMap?.get(item.upc)
            if (existing) {
              if (existing.quantity !== item.quantity || existing.netValue !== item.netValue) {
                await db
                  .update(ordersContent)
                  .set({ quantity: item.quantity, netValue: item.netValue })
                  .where(eq(ordersContent.id, existing.id))
                totalUpdatedRows++
                orderWasUpdated = true
              } else {
                totalIdenticalRows++
              }
            } else {
              await db.insert(ordersContent).values({
                sku: item.sku,
                quantity: item.quantity,
                netValue: item.netValue,
                upc: item.upc,
                billingDocumentId: existingOrder.id,
              })
              totalCreatedRows++
              orderWasUpdated = true
            }
          }
          if (orderWasUpdated) {
            totalOrdersUpdated++
          }
        } else {
          // Delete order and content if no content
          await db.delete(ordersContent).where(eq(ordersContent.billingDocumentId, existingOrder.id))
          await db.delete(orders).where(eq(orders.id, existingOrder.id))
          totalDeletedRows++
        }
      } else if (content.length > 0) {
        const [newOrder] = await db.insert(orders).values({ customerId: customer.id, orderDate: salesDate }).returning()
        if (newOrder) {
          totalOrdersCreated++
          const toInsert = content.map((item) => ({
            sku: item.sku,
            quantity: item.quantity,
            netValue: item.netValue,
            upc: item.upc,
            billingDocumentId: newOrder.id,
          }))
          await db.insert(ordersContent).values(toInsert)
          totalCreatedRows += toInsert.length
        }
      }

      // Competitor orders by brand
      const customerCompOrders = compOrdersByCustomerId.get(customer.id) ?? []
      for (const [brand, brandData] of Object.entries(rom.salesByBrand)) {
        const existingCompOrder = customerCompOrders.find((o) => o.brand === brand)
        if (existingCompOrder) {
          if (
            Number(existingCompOrder.quantity) !== brandData.units ||
            Number(existingCompOrder.value) !== brandData.sales
          ) {
            await db
              .update(competitorOrders)
              .set({ quantity: brandData.units, value: String(round(brandData.sales, 2)) })
              .where(eq(competitorOrders.id, existingCompOrder.id))
            totalUpdatedRows++
          } else {
            totalIdenticalRows++
          }
        } else {
          await db.insert(competitorOrders).values({
            customerId: customer.id,
            brand,
            quantity: brandData.units,
            value: String(round(brandData.sales, 2)),
            orderDate: salesDate,
          })
          totalCreatedRows++
        }
      }

      for (const existingCompOrder of customerCompOrders) {
        if (!rom.salesByBrand[existingCompOrder.brand ?? '']) {
          await db.delete(competitorOrders).where(eq(competitorOrders.id, existingCompOrder.id))
          totalDeletedRows++
        }
      }

      // Competitor sales aggregate
      const existingComp = compByCustomerId.get(customer.id)
      const compData = {
        customerId: customer.id,
        rydeUnits: ryde.units,
        rydeValue: round(ryde.sales, 2),
        romUnits: rom.units,
        romValue: round(rom.sales, 2),
        fileImport: dataImport.id,
      }

      if (existingComp) {
        if (
          existingComp.rydeUnits !== compData.rydeUnits ||
          existingComp.rydeValue !== compData.rydeValue ||
          existingComp.romUnits !== compData.romUnits ||
          existingComp.romValue !== compData.romValue
        ) {
          await db.update(competitorSales).set(compData).where(eq(competitorSales.id, existingComp.id))
          totalUpdatedRows++
        } else {
          totalIdenticalRows++
        }
      } else {
        await db.insert(competitorSales).values(compData)
        totalCreatedRows++
      }
    }
  }

  return {
    received: totalRowsReceived,
    ordersCreated: totalOrdersCreated,
    ordersUpdated: totalOrdersUpdated,
    rejected: [...new Set(allRejected)],
    createdRows: totalCreatedRows,
    updatedRows: totalUpdatedRows,
    deletedRows: totalDeletedRows,
    identicalRows: totalIdenticalRows,
    dataImportId: lastDataImportId,
  }
}

// ─── BG Fuels ────────────────────────────────────────────────────────────────

const BANNER_BG_FUELS = 'BG Fuels'

export const REPORT_TYPE_BG_FUELS = 'BG_FUELS'

export type BgFuelsProcessResult = NapOrangeProcessResult

export async function processBgFuelsFile(buffer: Buffer): Promise<BgFuelsProcessResult> {
  const fileContent = buffer.toString('utf-8')
  const lines = fileContent.split('\n').filter((l) => l.trim() !== '')

  const allRows = lines.map((line, index) => {
    const cols = line.split('|')
    return {
      rowNumber: index + 1,
      date: cols[0]?.trim() ?? '',
      bannerId: cols[1]?.trim() ?? '',
      description: cols[6]?.trim() ?? '',
      upc: cols[7]?.trim() ?? '',
      salesAmount: cols[8]?.trim() ?? '',
      salesUnits: cols[9]?.trim() ?? '',
    }
  })

  // Silently skip non-RYDE products — only process rows where description contains "ryde"
  const rows = allRows.filter((r) => r.description.toLowerCase().includes('ryde'))

  const upcProducts = await db
    .select({ customerUpc: customersUpc.customerUpc, sku: customersUpc.sku })
    .from(customersUpc)
    .where(eq(customersUpc.banner, BANNER_BG_FUELS))

  const upcByCustomerUpc = new Map(upcProducts.map((p) => [p.customerUpc, p]))

  const INVALID_DATE = 'INVALID_DATE'

  // Group rows by ISO week start — unmatched UPCs will be rejected later
  const rowsByWeek = new Map<string, typeof rows>()
  for (const row of rows) {
    const parsed = parse(row.date, 'yyyyMMdd', new Date())
    if (isNaN(parsed.getTime())) {
      const bucket = rowsByWeek.get(INVALID_DATE) ?? []
      bucket.push(row)
      rowsByWeek.set(INVALID_DATE, bucket)
      continue
    }
    const weekKey = format(startOfISOWeek(parsed), 'yyyy-MM-dd')
    const bucket = rowsByWeek.get(weekKey) ?? []
    bucket.push(row)
    rowsByWeek.set(weekKey, bucket)
  }

  const bgFuelsCustomers = await db.select().from(customers).where(eq(customers.banner, BANNER_BG_FUELS))

  // Map-based lookups
  const customerByBannerInternalId = new Map(bgFuelsCustomers.map((c) => [c.bannerInternalId, c]))
  const customerIds = bgFuelsCustomers.map((c) => c.id)

  // Handle invalid date rows upfront
  const invalidDateRows = rowsByWeek.get(INVALID_DATE)
  const initialRejected: string[] = invalidDateRows
    ? [ERRORS.custom(invalidDateRows.map((r) => r.rowNumber).join(', '), 'Invalid date provided')]
    : []

  const validWeeks = [...rowsByWeek.entries()].filter(([key]) => key !== INVALID_DATE)

  let totalOrdersCreated = 0
  let totalOrdersUpdated = 0
  let totalCreatedRows = 0
  let totalUpdatedRows = 0
  let totalIdenticalRows = 0
  const allRejected: string[] = [...initialRejected]
  let lastDataImportId = 0

  for (const [weekKey, weekRows] of validWeeks) {
    const periodStartDate = new Date(weekKey + 'T00:00:00Z')
    const periodStart = format(periodStartDate, 'yyyy-MM-dd')
    const periodEnd = format(endOfISOWeek(periodStartDate), 'yyyy-MM-dd')
    const rydeWeek = differenceInWeeks(periodStartDate, RYDE_WEEK_0_GENERIC)

    const dataImport = await getOrCreateBannerDataImport(periodStart, periodEnd, rydeWeek, BANNER_BG_FUELS)
    lastDataImportId = dataImport.id

    const existingOrderRows = customerIds.length
      ? await db
          .select()
          .from(orders)
          .where(and(inArray(orders.customerId, customerIds), eq(orders.orderDate, periodStart)))
      : []

    const orderByCustomerId = new Map(existingOrderRows.map((o) => [o.customerId, o]))

    const existingOrderIds = existingOrderRows.map((o) => o.id)
    const existingContentRows = existingOrderIds.length
      ? await db.select().from(ordersContent).where(inArray(ordersContent.billingDocumentId, existingOrderIds))
      : []

    const existingContentByOrderId = new Map<number, Map<string | null, typeof ordersContent.$inferSelect>>()
    for (const row of existingContentRows) {
      let upcMap = existingContentByOrderId.get(row.billingDocumentId)
      if (!upcMap) {
        upcMap = new Map()
        existingContentByOrderId.set(row.billingDocumentId, upcMap)
      }
      upcMap.set(row.upc, row)
    }

    // Group rows by store (bannerId)
    const byStore = new Map<string, typeof weekRows>()
    for (const row of weekRows) {
      const bucket = byStore.get(row.bannerId) ?? []
      bucket.push(row)
      byStore.set(row.bannerId, bucket)
    }

    for (const [bannerId, storeRows] of byStore) {
      if (!bannerId) {
        allRejected.push(ERRORS.custom(storeRows.map((r) => r.rowNumber).join(', '), 'Missing Banner ID'))
        continue
      }

      const customer = customerByBannerInternalId.get(bannerId)
      if (!customer) {
        allRejected.push(ERRORS.custom(storeRows.map((r) => r.rowNumber).join(', '), `Unknown Banner ID "${bannerId}"`))
        continue
      }

      // Group rows by UPC and aggregate
      const byUpc = new Map<string, typeof storeRows>()
      for (const row of storeRows) {
        const bucket = byUpc.get(row.upc) ?? []
        bucket.push(row)
        byUpc.set(row.upc, bucket)
      }

      const content: { sku: string; quantity: number; netValue: number; upc: string }[] = []

      for (const [upc, upcRows] of byUpc) {
        const linkedProduct = upcByCustomerUpc.get(upc)
        if (!linkedProduct || !linkedProduct.sku) {
          allRejected.push(ERRORS.invalidUPC(upcRows.map((r) => r.rowNumber).join(', '), upc))
          continue
        }

        const sku = linkedProduct.sku

        const quantity = sumBy(upcRows, (r) => Number(r.salesUnits) || 0)
        const netValue = round(
          sumBy(upcRows, (r) => Number(r.salesAmount) || 0),
          2,
        )

        if (!quantity) continue
        content.push({ sku, quantity, netValue, upc })
      }

      if (content.length === 0) continue

      const existingOrder = orderByCustomerId.get(customer.id)

      if (existingOrder) {
        const existingUpcMap = existingContentByOrderId.get(existingOrder.id)
        let orderWasUpdated = false
        for (const item of content) {
          const existing = existingUpcMap?.get(item.upc)
          if (existing) {
            if (existing.quantity !== item.quantity) {
              await db.update(ordersContent).set({ quantity: item.quantity }).where(eq(ordersContent.id, existing.id))
              totalUpdatedRows++
              orderWasUpdated = true
            } else {
              totalIdenticalRows++
            }
          } else {
            await db.insert(ordersContent).values({
              sku: item.sku,
              quantity: item.quantity,
              netValue: item.netValue,
              upc: item.upc,
              billingDocumentId: existingOrder.id,
            })
            totalCreatedRows++
            orderWasUpdated = true
          }
        }
        if (orderWasUpdated) totalOrdersUpdated++
      } else {
        const [newOrder] = await db
          .insert(orders)
          .values({ customerId: customer.id, orderDate: periodStart })
          .returning()
        if (!newOrder) continue
        totalOrdersCreated++
        const toInsert = content.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
          netValue: item.netValue,
          upc: item.upc,
          billingDocumentId: newOrder.id,
        }))
        await db.insert(ordersContent).values(toInsert)
        totalCreatedRows += toInsert.length
      }
    }
  }

  return {
    received: rows.length,
    ordersCreated: totalOrdersCreated,
    ordersUpdated: totalOrdersUpdated,
    rejected: allRejected,
    createdRows: totalCreatedRows,
    updatedRows: totalUpdatedRows,
    deletedRows: 0,
    identicalRows: totalIdenticalRows,
    dataImportId: lastDataImportId,
  }
}
