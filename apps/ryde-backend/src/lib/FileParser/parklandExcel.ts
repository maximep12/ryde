import Excel from 'exceljs'
import { isDate } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParklandSalesEntry = {
  id: string
  lines: number[]
  ryde: { sales: number; units: number }
  rom: { sales: number; units: number; salesByBrand: Record<string, { sales: number; units: number }> }
}

export type ParklandDateData = { date: string; sales: ParklandSalesEntry[] }

export type ParsedParkland = { data: ParklandDateData[]; totalRowsReceived: number }

// Canadian provinces and territories — should NOT be treated as brands
const CANADIAN_PROVINCES = new Set([
  'ALBERTA',
  'BRITISH COLUMBIA',
  'MANITOBA',
  'NEW BRUNSWICK',
  'NEWFOUNDLAND',
  'NEWFOUNDLAND AND LABRADOR',
  'NORTHWEST TERRITORIES',
  'NOVA SCOTIA',
  'NUNAVUT',
  'ONTARIO',
  'PRINCE EDWARD ISLAND',
  'QUEBEC',
  'SASKATCHEWAN',
  'YUKON',
])

// ─── Main export ──────────────────────────────────────────────────────────────

export async function parseParklandSellOut({
  stream,
}: {
  stream: NodeJS.ReadableStream
}): Promise<ParsedParkland> {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  const sheet = workbook.getWorksheet('Data')
  if (!sheet) throw new Error('Missing Data in the workbook')

  const dates = extractDates(sheet.getRow(4))
  const { storesData, totalRowsReceived } = parseStoreData(sheet, dates)
  const data = reorganizeByDate(storesData, dates)

  return { data, totalRowsReceived }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function round(num: number, decimals = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

type DateEntry = { date: string; columnNumber: number }

function extractDates(dateRow: Excel.Row): DateEntry[] {
  const dates: DateEntry[] = []

  for (let colNum = 3; colNum <= dateRow.cellCount; colNum += 3) {
    const value = dateRow.getCell(colNum).value

    if (!value) break
    if (typeof value === 'string' && value.toLowerCase().includes('total')) break

    let dateObj: Date | null = null

    if (isDate(value)) {
      dateObj = value as Date
    } else if (typeof value === 'object' && value !== null && 'result' in value) {
      const result = (value as { result: unknown }).result
      if (isDate(result)) dateObj = result as Date
    } else if (typeof value === 'string') {
      // Parse M/D/YYYY format
      const parts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (parts) {
        dateObj = new Date(Date.UTC(Number(parts[3]), Number(parts[1]) - 1, Number(parts[2])))
      }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
      // If Sunday (day = 0), move to Monday (+1 day)
      if (dateObj.getUTCDay() === 0) {
        dateObj = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000)
      }

      const yyyy = dateObj.getUTCFullYear()
      const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(dateObj.getUTCDate()).padStart(2, '0')
      dates.push({ date: `${yyyy}-${mm}-${dd}`, columnNumber: colNum })
    }
  }

  return dates
}

type ProductData = {
  name: string
  brand: string
  isRyde: boolean
  salesByDate: Record<string, { sales: number; units: number }>
}

type StoreRawData = {
  id: string
  lines: number[]
  sales: { date: string; ryde: ParklandSalesEntry['ryde']; rom: ParklandSalesEntry['rom'] }[]
}

function parseStoreData(
  sheet: Excel.Worksheet,
  dates: DateEntry[],
): { storesData: StoreRawData[]; totalRowsReceived: number } {
  const storesData: StoreRawData[] = []
  let currentStore: string | null = null
  let currentStoreProducts: ProductData[] = []
  let currentStoreLines: number[] = []
  let shouldStop = false
  let totalRowsReceived = 0

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 5) return
    if (shouldStop) return

    const rowLabel = row.getCell(2).value?.toString().trim()
    if (!rowLabel) return

    const lowerLabel = rowLabel.toLowerCase()
    if (
      lowerLabel.includes('total') ||
      lowerLabel.includes('grand total') ||
      lowerLabel.includes('summary') ||
      lowerLabel === 'end' ||
      lowerLabel.startsWith('total ')
    ) {
      shouldStop = true
      return
    }

    if (CANADIAN_PROVINCES.has(rowLabel.toUpperCase())) return
    if (rowLabel === 'Alternative Pkgd Bvgs' || rowLabel === 'Row Labels') return

    if (/^\d+$/.test(rowLabel)) {
      // Store ID row
      totalRowsReceived++

      if (currentStore) {
        storesData.push({
          id: currentStore,
          lines: currentStoreLines,
          sales: aggregateStoreSales(currentStoreProducts, dates),
        })
      }

      currentStore = rowLabel
      currentStoreProducts = []
      currentStoreLines = [rowNumber]
    } else if (currentStore) {
      // Product row
      totalRowsReceived++
      currentStoreLines.push(rowNumber)

      const productData: ProductData = {
        name: rowLabel,
        brand: rowLabel,
        isRyde: rowLabel.toUpperCase().includes('RYDE'),
        salesByDate: {},
      }

      for (const { date, columnNumber } of dates) {
        const sales = parseFloat(String(row.getCell(columnNumber).value)) || 0
        const units = parseInt(String(row.getCell(columnNumber + 1).value)) || 0
        productData.salesByDate[date] = { sales, units }
      }

      currentStoreProducts.push(productData)
    }
  })

  // Last store
  if (currentStore && currentStoreProducts.length > 0) {
    storesData.push({
      id: currentStore,
      lines: currentStoreLines,
      sales: aggregateStoreSales(currentStoreProducts, dates),
    })
  }

  return { storesData, totalRowsReceived }
}

function aggregateStoreSales(
  products: ProductData[],
  dates: DateEntry[],
): StoreRawData['sales'] {
  return dates.map(({ date }) => {
    let rydeSales = 0
    let rydeUnits = 0
    let romSales = 0
    let romUnits = 0
    const romByBrand: Record<string, { sales: number; units: number }> = {}

    for (const product of products) {
      const dateSales = product.salesByDate[date]
      if (!dateSales) continue

      if (product.isRyde) {
        rydeSales += dateSales.sales
        rydeUnits += dateSales.units
      } else {
        romSales += dateSales.sales
        romUnits += dateSales.units

        const brand = product.brand
        if (!romByBrand[brand]) romByBrand[brand] = { sales: 0, units: 0 }
        romByBrand[brand]!.sales += dateSales.sales
        romByBrand[brand]!.units += dateSales.units
      }
    }

    // Filter and round brand sales
    const salesByBrand: Record<string, { sales: number; units: number }> = {}
    for (const [brand, data] of Object.entries(romByBrand)) {
      if (data.sales !== 0 || data.units !== 0) {
        salesByBrand[brand] = { sales: round(data.sales, 2), units: data.units }
      }
    }

    return {
      date,
      ryde: { sales: round(rydeSales, 2), units: rydeUnits },
      rom: { sales: round(romSales, 2), units: romUnits, salesByBrand },
    }
  })
}

function reorganizeByDate(storesData: StoreRawData[], dates: DateEntry[]): ParklandDateData[] {
  const dateMap = new Map<string, ParklandDateData>()

  for (const { date } of dates) {
    dateMap.set(date, { date, sales: [] })
  }

  for (const store of storesData) {
    for (const daySale of store.sales) {
      const entry = dateMap.get(daySale.date)
      if (entry) {
        entry.sales.push({
          id: store.id,
          lines: store.lines,
          ryde: daySale.ryde,
          rom: daySale.rom,
        })
      }
    }
  }

  return Array.from(dateMap.values())
}
