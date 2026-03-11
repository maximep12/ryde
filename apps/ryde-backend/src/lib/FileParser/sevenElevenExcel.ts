import Excel from 'exceljs'

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = { start: string; end: string }

export type SevenElevenProduct = {
  rowNumber: number
  itemCode: string
  description: string
  upc: string | null
  pack: number | null
  size: string | null
  quantity: number
  amount: number
}

export type SalesByCustomer = { customerId: string; products: SevenElevenProduct[] }

export type ParsedWHToStore = {
  dateRange: DateRange
  salesByCustomer: SalesByCustomer[]
  totalRowsReceived: number
}

// ─── parseSevenElevenWHToStore ────────────────────────────────────────────────

/**
 * Parses a 7-Eleven WH to Store Excel file (SSR_001 format)
 */
export async function parseSevenElevenWHToStore({
  stream,
}: {
  stream: NodeJS.ReadableStream
}): Promise<ParsedWHToStore> {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  const sheet = workbook.getWorksheet('SSR_001')
  if (!sheet) throw new Error('Missing SSR_001 sheet in the workbook')

  const dateRange = extractDateRange(sheet)
  const { salesByCustomer, totalRowsReceived } = parseWHToStoreSalesData(sheet)

  return { dateRange, salesByCustomer, totalRowsReceived }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function extractDateRange(sheet: Excel.Worksheet): DateRange {
  const row6 = sheet.getRow(6)

  let dateRangeStr: string | null = null
  row6.eachCell((cell) => {
    const value = cell.value?.toString().trim()
    if (value && value.includes(' - ')) dateRangeStr = value
  })

  if (!dateRangeStr) throw new Error('Could not find date range in row 6')

  const parts = (dateRangeStr as string).split(/\s+-\s+/)
  if (parts.length !== 2) throw new Error(`Could not parse date range from: ${dateRangeStr}`)

  const start = (parts[0] ?? '').trim()
  const end = (parts[1] ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error(`Invalid date range: ${start} - ${end}`)
  }

  return { start, end }
}

function round(num: number, decimals = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

function parseWHToStoreSalesData(sheet: Excel.Worksheet): {
  salesByCustomer: SalesByCustomer[]
  totalRowsReceived: number
} {
  const customersMap = new Map<string, SalesByCustomer>()
  let currentCustomerId: string | null = null
  let totalRowsReceived = 0

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 18) return

    const values = (row.values as unknown[]).slice(1)
    const col7Value = values[6]?.toString().trim()

    if (!col7Value) return
    if (col7Value === 'HEALTH & BEAUTY') return

    const storeIdMatch = col7Value.match(/^(\d{6})\s*$/)
    if (storeIdMatch) {
      currentCustomerId = parseInt(storeIdMatch[1] ?? '0', 10).toString()
      if (!customersMap.has(currentCustomerId)) {
        customersMap.set(currentCustomerId, { customerId: currentCustomerId, products: [] })
      }
      return
    }

    if (col7Value.startsWith('TOTAL:')) return

    if (currentCustomerId) {
      const itemCode = values[4]?.toString().trim() ?? ''
      const description = col7Value
      const upc = values[12]?.toString().trim() ?? null
      const packRaw = values[15]
      const pack = packRaw !== undefined && packRaw !== null ? Number(packRaw) : null
      const size = values[16]?.toString().trim() ?? null
      const quantityRaw = values[17]
      const amountRaw = values[18]

      if (itemCode && description && quantityRaw !== undefined) {
        totalRowsReceived++
        const customer = customersMap.get(currentCustomerId)
        if (!customer) return
        customer.products.push({
          rowNumber,
          itemCode,
          description,
          upc: upc || null,
          pack,
          size: size || null,
          quantity: typeof quantityRaw === 'number' ? quantityRaw : parseFloat(String(quantityRaw)) || 0,
          amount: round(typeof amountRaw === 'number' ? amountRaw : parseFloat(String(amountRaw)) || 0, 2),
        })
      }
    }
  })

  return { salesByCustomer: Array.from(customersMap.values()), totalRowsReceived }
}
