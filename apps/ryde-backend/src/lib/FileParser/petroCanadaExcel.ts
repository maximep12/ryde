import Excel from 'exceljs'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PetroCanadaSalesEntry = {
  id: string
  lines: number[]
  ryde: {
    sales: number
    units: number
    byUpc: Record<string, { product: string; units: number; sales: number }>
  }
  rom: {
    sales: number
    units: number
    salesByBrand: Record<string, { units: number; sales: number }>
  }
}

export type PetroCanadaDateData = { date: string; sales: PetroCanadaSalesEntry[] }

export type ParsedPetroCanada = { data: PetroCanadaDateData[]; totalRowsReceived: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const RYDE_BRANDS = ['RYDE']
const ROM_BRANDS = ['5 HOUR', '5 HOUR ENERGY', 'DOSE']

// ─── Main export ──────────────────────────────────────────────────────────────

export async function parsePetroCanadaSellOut({
  stream,
}: {
  stream: NodeJS.ReadableStream
}): Promise<ParsedPetroCanada> {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  const unitSalesSheet = workbook.getWorksheet('Unit Sales')
  const dollarSalesSheet = workbook.getWorksheet('$ Sales')

  if (!unitSalesSheet) throw new Error('Missing Unit Sales sheet in the workbook')
  if (!dollarSalesSheet) throw new Error('Missing $ Sales sheet in the workbook')

  const dates = findAndExtractDates(unitSalesSheet)
  const { storesData, totalRowsReceived } = parseStoreData(unitSalesSheet, dollarSalesSheet, dates)
  const data = reorganizeByDate(storesData, dates)

  return { data, totalRowsReceived }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function round(num: number, decimals = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

type DateEntry = { date: string; columnNumber: number; dateRowNumber: number }

function findAndExtractDates(sheet: Excel.Worksheet): DateEntry[] {
  const dates: DateEntry[] = []
  let dateRowNumber: number | null = null

  // Search rows 1-50 for the date header row
  for (let rowNum = 1; rowNum <= 50; rowNum++) {
    const row = sheet.getRow(rowNum)
    for (let colNum = 8; colNum <= 15; colNum++) {
      const value = row.getCell(colNum).value
      if (typeof value === 'string' && /^(\w+ \d+, \d{4}),\s*Wk\s*\d+/.test(value)) {
        dateRowNumber = rowNum
        break
      }
    }
    if (dateRowNumber) break
  }

  if (!dateRowNumber) throw new Error('Could not find date header row in Unit Sales sheet')

  const dateRow = sheet.getRow(dateRowNumber)

  for (let colNum = 10; colNum <= 100; colNum++) {
    const value = dateRow.getCell(colNum).value
    if (!value) break

    if (typeof value === 'string') {
      const match = value.match(/^(\w+ \d+, \d{4})/)
      if (match) {
        const dateStr = match[1]!
        // Parse "January 6, 2025" format
        const parsed = new Date(dateStr + ' UTC')

        if (!isNaN(parsed.getTime())) {
          // Convert to the Monday of the previous week
          const dayOfWeek = parsed.getUTCDay()
          let offsetDays: number
          if (dayOfWeek === 0) {
            // Sunday → move back 13 days (6 to Monday + 7 for previous week)
            offsetDays = 13
          } else {
            // Any day → move back to Monday of current week, then back 7 more days
            offsetDays = dayOfWeek - 1 + 7
          }

          const targetDate = new Date(parsed.getTime() - offsetDays * 24 * 60 * 60 * 1000)
          const yyyy = targetDate.getUTCFullYear()
          const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0')
          const dd = String(targetDate.getUTCDate()).padStart(2, '0')

          dates.push({ date: `${yyyy}-${mm}-${dd}`, columnNumber: colNum, dateRowNumber })
        }
      }
    }
  }

  return dates
}

type StoreAccumulator = {
  id: string
  lines: number[]
  salesByDate: Map<
    string,
    {
      date: string
      rydeUnits: number
      rydeSales: number
      rydeByUpc: Map<string, { product: string; units: number; sales: number }>
      romUnits: number
      romSales: number
      romByBrand: Map<string, { units: number; sales: number }>
    }
  >
}

function parseStoreData(
  unitSalesSheet: Excel.Worksheet,
  dollarSalesSheet: Excel.Worksheet,
  dates: DateEntry[],
): {
  storesData: { id: string; lines: number[]; sales: { date: string; ryde: PetroCanadaSalesEntry['ryde']; rom: PetroCanadaSalesEntry['rom'] }[] }[]
  totalRowsReceived: number
} {
  const storesMap = new Map<string, StoreAccumulator>()
  let totalRowsReceived = 0

  const dateRowNumber = dates.length > 0 ? dates[0]!.dateRowNumber : 28
  const dataStartRow = dateRowNumber + 1

  unitSalesSheet.eachRow((row, rowNumber) => {
    if (rowNumber <= dataStartRow) return

    const productName = row.getCell(1).value?.toString().trim()
    const upc = row.getCell(2).value?.toString().trim()
    const brand = row.getCell(5).value?.toString().trim()
    const storeNumber = row.getCell(9).value?.toString().trim()

    if (!brand || !storeNumber || !productName || productName === 'Total') return

    const isRyde = RYDE_BRANDS.some((b) => brand.toUpperCase().includes(b))
    const isRom = ROM_BRANDS.some((b) => brand.toUpperCase().includes(b))

    if (!isRyde && !isRom) return

    totalRowsReceived++

    if (!storesMap.has(storeNumber)) {
      storesMap.set(storeNumber, { id: storeNumber, lines: [], salesByDate: new Map() })
    }

    const store = storesMap.get(storeNumber)!
    store.lines.push(rowNumber)

    const dollarRow = dollarSalesSheet.getRow(rowNumber)

    for (const { date, columnNumber } of dates) {
      const units = parseInt(String(row.getCell(columnNumber).value)) || 0
      const sales = parseFloat(String(dollarRow.getCell(columnNumber).value)) || 0

      if (!store.salesByDate.has(date)) {
        store.salesByDate.set(date, {
          date,
          rydeUnits: 0,
          rydeSales: 0,
          rydeByUpc: new Map(),
          romUnits: 0,
          romSales: 0,
          romByBrand: new Map(),
        })
      }

      const dateSales = store.salesByDate.get(date)!

      if (isRyde) {
        dateSales.rydeUnits += units
        dateSales.rydeSales += sales

        if (upc) {
          if (!dateSales.rydeByUpc.has(upc)) {
            dateSales.rydeByUpc.set(upc, { product: productName, units: 0, sales: 0 })
          }
          const upcData = dateSales.rydeByUpc.get(upc)!
          upcData.units += units
          upcData.sales += sales
        }
      } else if (isRom) {
        dateSales.romUnits += units
        dateSales.romSales += sales

        const brandKey = brand.toUpperCase().includes('5 HOUR') ? '5 hour' : 'Dose'
        if (!dateSales.romByBrand.has(brandKey)) {
          dateSales.romByBrand.set(brandKey, { units: 0, sales: 0 })
        }
        const brandData = dateSales.romByBrand.get(brandKey)!
        brandData.units += units
        brandData.sales += sales
      }
    }
  })

  const storesData = Array.from(storesMap.values()).map((store) => ({
    id: store.id,
    lines: store.lines,
    sales: Array.from(store.salesByDate.values()).map((s) => ({
      date: s.date,
      ryde: {
        sales: round(s.rydeSales, 2),
        units: s.rydeUnits,
        byUpc: Object.fromEntries(
          Array.from(s.rydeByUpc.entries())
            .filter(([, data]) => data.units > 0)
            .map(([upcKey, data]) => [upcKey, { product: data.product, units: data.units, sales: round(data.sales, 2) }]),
        ),
      },
      rom: {
        sales: round(s.romSales, 2),
        units: s.romUnits,
        salesByBrand: Object.fromEntries(
          Array.from(s.romByBrand.entries())
            .filter(([, data]) => data.units > 0)
            .map(([brandKey, data]) => [brandKey, { units: data.units, sales: round(data.sales, 2) }]),
        ),
      },
    })),
  }))

  return { storesData, totalRowsReceived }
}

function reorganizeByDate(
  storesData: { id: string; lines: number[]; sales: { date: string; ryde: PetroCanadaSalesEntry['ryde']; rom: PetroCanadaSalesEntry['rom'] }[] }[],
  dates: DateEntry[],
): PetroCanadaDateData[] {
  const dateMap = new Map<string, PetroCanadaDateData>()

  for (const { date } of dates) {
    dateMap.set(date, { date, sales: [] })
  }

  for (const store of storesData) {
    for (const daySale of store.sales) {
      const entry = dateMap.get(daySale.date)
      if (entry) {
        entry.sales.push({ id: store.id, lines: store.lines, ryde: daySale.ryde, rom: daySale.rom })
      }
    }
  }

  return Array.from(dateMap.values())
}
