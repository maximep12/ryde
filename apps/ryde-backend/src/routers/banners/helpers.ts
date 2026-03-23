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
import { and, eq, inArray, like, notLike, or } from 'drizzle-orm'
import round from 'lodash/round.js'
import sumBy from 'lodash/sumBy.js'
import { Readable } from 'node:stream'
import { db } from '../../db'
import { parseCircleKSellOut } from '../../lib/FileParser/circleKExcel'
import { parseCsvStream } from '../../lib/FileParser/csv'
import { readExcelFile } from '../../lib/FileParser/excel'
import { bufferToStream } from '../../lib/fileUpload'
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
