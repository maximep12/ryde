import Excel from 'exceljs'
import { addWeeks, format } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type ByUpcEntry = {
  product: string
  units: number
  sales: number
}

export type CircleKStore = {
  id: string
  lines: number[]
  ryde: {
    units: number
    sales: number
    byUpc: Record<string, { product: string; units: number; sales: number }>
  }
  rom: {
    units: number
    sales: number
  }
}

export type CircleKWeekData = {
  date: string
  sales: CircleKStore[]
}

export type ParsedCircleKSellOut = {
  data: CircleKWeekData[]
  totalRowsReceived: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Circle K RYDE item numbers (column headers in row 2)
const RYDE_ITEMS = new Set(['111043', '111044', '111045'])

// Fiscal calendar base dates (FY26 FW01 = 5/4/2025)
const FISCAL_CALENDAR: Record<string, { baseDate: string; baseWeek: number }> = {
  FY25: { baseDate: '2024-05-05', baseWeek: 1 },
  FY26: { baseDate: '2025-05-04', baseWeek: 1 },
  FY27: { baseDate: '2026-05-03', baseWeek: 1 },
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function parseCircleKSellOut({
  stream,
}: {
  stream: NodeJS.ReadableStream
}): Promise<ParsedCircleKSellOut> {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  let totalRowsReceived = 0
  const weekData: { date: string; storesData: CircleKStore[] }[] = []

  workbook.eachSheet((sheet) => {
    try {
      if (sheet.name === 'Data') return

      const firstCell = sheet.getCell(1, 1).value
      if (!firstCell) return

      const fiscalInfo = extractFiscalInfo(firstCell.toString())
      if (!fiscalInfo) return

      const date = calculateDateFromFiscal(fiscalInfo.fy, fiscalInfo.fw)
      if (!date) {
        console.warn(`Could not calculate date for ${fiscalInfo.fy} FW${fiscalInfo.fw}`)
        return
      }

      const { storesData, rowsReceived } = parseStoreData(sheet)
      totalRowsReceived += rowsReceived
      weekData.push({ date, storesData })
    } catch (error) {
      console.error(`Error processing sheet ${sheet.name}:`, (error as Error).message)
    }
  })

  if (weekData.length === 0) {
    throw new Error('No valid fiscal week data found in workbook')
  }

  return {
    data: weekData.map(({ date, storesData }) => ({ date, sales: storesData })),
    totalRowsReceived,
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function extractFiscalInfo(value: string): { fy: string; fw: number } | null {
  const match = value.match(/FY(\d+)\s*FW(\d+)/i)
  if (!match) return null
  return { fy: `FY${match[1]}`, fw: parseInt(match[2] ?? '0', 10) }
}

function calculateDateFromFiscal(fy: string, fw: number): string | null {
  const fiscalYear = FISCAL_CALENDAR[fy]
  if (!fiscalYear) {
    console.warn(`Unknown fiscal year: ${fy}`)
    return null
  }
  const weekOffset = fw - fiscalYear.baseWeek
  const date = addWeeks(new Date(fiscalYear.baseDate + 'T00:00:00Z'), weekOffset)
  return format(date, 'yyyy-MM-dd')
}

function parseStoreData(sheet: Excel.Worksheet): { storesData: CircleKStore[]; rowsReceived: number } {
  const storesMap = new Map<
    string,
    { id: string; lines: number[]; rydeUnits: number; rydeSales: number; rydeByUpc: Map<string, ByUpcEntry> }
  >()
  let rowsReceived = 0

  // Extract item numbers from row 2 to map columns
  const itemRow = sheet.getRow(2)
  const itemMapping: { col: number; itemNum: string; isUnits: boolean }[] = []
  for (let col = 4; col <= 9; col++) {
    const itemValue = itemRow.getCell(col).value
    if (itemValue) {
      const itemNum = itemValue.toString().trim()
      itemMapping.push({ col, itemNum, isUnits: col <= 6 })
    }
  }

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return

    const rdoName = row.getCell(1).value?.toString().trim() ?? ''
    const market = row.getCell(2).value?.toString().trim() ?? ''
    const siteNumberRaw = row.getCell(3).value?.toString().trim()

    if (!siteNumberRaw) return

    if (
      rdoName.toLowerCase().includes('total') ||
      market.toLowerCase().includes('total') ||
      siteNumberRaw.toLowerCase().includes('total')
    ) {
      return
    }

    // Remove the "3" prefix and all following zeros (e.g. 3000004 → 4, 3000020 → 20)
    const siteNumber = siteNumberRaw.replace(/^3[0]*/, '')
    rowsReceived++

    if (!storesMap.has(siteNumber)) {
      storesMap.set(siteNumber, { id: siteNumber, lines: [], rydeUnits: 0, rydeSales: 0, rydeByUpc: new Map() })
    }

    const store = storesMap.get(siteNumber)!
    store.lines.push(rowNumber)

    for (const { col, itemNum, isUnits } of itemMapping) {
      if (!RYDE_ITEMS.has(itemNum)) continue

      const value = row.getCell(col).value
      let numValue = 0
      if (typeof value === 'number') {
        numValue = value
      } else if (value !== null && typeof value === 'object' && 'result' in (value as object)) {
        numValue = parseFloat(String((value as unknown as Record<string, unknown>)['result'])) || 0
      } else if (value) {
        numValue = parseFloat(String(value)) || 0
      }

      if (numValue === 0) continue

      if (!store.rydeByUpc.has(itemNum)) {
        store.rydeByUpc.set(itemNum, { product: `Circle K Item ${itemNum}`, units: 0, sales: 0 })
      }

      const upcData = store.rydeByUpc.get(itemNum)!
      if (isUnits) {
        const units = Math.trunc(numValue) || 0
        upcData.units += units
        store.rydeUnits += units
      } else {
        upcData.sales += numValue
        store.rydeSales += numValue
      }
    }
  })

  const storesData: CircleKStore[] = Array.from(storesMap.values()).map((store) => ({
    id: store.id,
    lines: store.lines,
    ryde: {
      sales: round(store.rydeSales, 2),
      units: store.rydeUnits,
      byUpc: Object.fromEntries(
        Array.from(store.rydeByUpc.entries())
          .filter(([, d]) => d.units > 0 || d.sales > 0)
          .map(([upc, d]) => [upc, { product: d.product, units: d.units, sales: round(d.sales, 2) }]),
      ),
    },
    rom: { sales: 0, units: 0 },
  }))

  return { storesData, rowsReceived }
}

function round(num: number, decimals = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}
