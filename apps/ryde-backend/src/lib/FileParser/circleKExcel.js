import Excel from 'exceljs'
import moment from 'moment'
import lodash from 'lodash'

const { round } = lodash

// Circle K RYDE item numbers (these are the column headers in row 2)
const RYDE_ITEMS = ['111043', '111044', '111045']

// Fiscal calendar base dates (FY26 FW01 = 5/4/2025)
const FISCAL_CALENDAR = {
  FY26: {
    baseDate: '2025-05-04', // FW01
    baseWeek: 1,
  },
  FY25: {
    baseDate: '2024-05-05', // FW01
    baseWeek: 1,
  },
  FY27: {
    baseDate: '2026-05-03', // FW01 (estimated)
    baseWeek: 1,
  },
}

/**
 * Parses a Circle K Excel file with the same signature as parsePetroCanadaSellOut
 * @param {Object} params
 * @param {Stream} params.stream - File stream
 * @param {Array} params.expected - Expected sheets configuration (not used, kept for compatibility)
 * @param {Array} params.optional - Optional columns (not used, kept for compatibility)
 * @returns {Promise<Object>} {data: Array of {date, sales: [{id, lines, ryde, rom}]}, totalRowsReceived: number}
 */
export async function parseCircleKSellOut({ stream, expected, optional = [] }) {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  let totalRowsReceived = 0
  const weekData = []

  // Process each worksheet (each FWxx sheet represents a fiscal week)
  workbook.eachSheet((sheet, sheetId) => {
    try {
      // Skip the "Data" sheet - only process FWxx sheets
      if (sheet.name === 'Data') return

      // Extract FY and FW from first cell (A1)
      const firstCell = sheet.getCell(1, 1).value
      if (!firstCell) return

      const fiscalInfo = extractFiscalInfo(firstCell.toString())
      if (!fiscalInfo) return

      const { fy, fw } = fiscalInfo
      const date = calculateDateFromFiscal(fy, fw)

      if (!date) {
        console.warn(`Could not calculate date for ${fy} ${fw}`)
        return
      }

      // Parse store data from this sheet
      const { storesData, rowsReceived } = parseStoreData(sheet)
      totalRowsReceived += rowsReceived

      // Add week data
      weekData.push({
        date,
        storesData,
      })
    } catch (error) {
      console.error(`Error processing sheet ${sheet.name}:`, error.message)
    }
  })

  if (weekData.length === 0) {
    throw new Error('No valid fiscal week data found in workbook')
  }

  // Reorganize by date (same format as Petro Canada)
  const dateData = reorganizeByDate(weekData)

  return {
    data: dateData,
    totalRowsReceived,
  }
}

/**
 * Extracts fiscal year and week from cell value
 * Expected formats: "FY26 FW01", "FY26FW01", etc.
 */
function extractFiscalInfo(value) {
  const match = value.match(/FY(\d+)\s*FW(\d+)/i)
  if (!match) return null

  return {
    fy: `FY${match[1]}`,
    fw: parseInt(match[2], 10),
  }
}

/**
 * Calculates the date for a given fiscal year and week
 * FY26 FW01 = 5/4/2025, FY26 FW02 = 5/11/2025, etc.
 */
function calculateDateFromFiscal(fy, fw) {
  const fiscalYear = FISCAL_CALENDAR[fy]
  if (!fiscalYear) {
    console.warn(`Unknown fiscal year: ${fy}`)
    return null
  }

  // Calculate date: base date + (fw - baseWeek) weeks
  const weekOffset = fw - fiscalYear.baseWeek
  const date = moment.utc(fiscalYear.baseDate).add(weekOffset, 'weeks')

  return date.format('YYYY-MM-DD')
}

/**
 * Parses the sheet to extract sales data
 * Sheet structure:
 * - Row 1: FY and FW (e.g., "FY26 FW20")
 * - Row 2: Item numbers for units columns (111043, 111044, 111045)
 * - Row 3: Headers (RDO, Market, Site Number, product names)
 * - Row 4+: Data rows
 *   - Column A: RDO name
 *   - Column B: Market number
 *   - Column C: Site Number
 *   - Columns D, E, F: Units for items 111043, 111044, 111045
 *   - Columns G, H, I: Sales for items 111043, 111044, 111045
 */
function parseStoreData(sheet) {
  const storesMap = new Map()
  let rowsReceived = 0

  // Extract item numbers from row 2 to map columns
  const itemRow = sheet.getRow(2)
  const itemMapping = []
  for (let col = 4; col <= 9; col++) {
    const itemValue = itemRow.getCell(col).value
    if (itemValue) {
      const itemNum = itemValue.toString().trim()
      const isUnits = col <= 6 // Columns D, E, F are units
      itemMapping.push({ col, itemNum, isUnits })
    }
  }

  sheet.eachRow((row, rowNumber) => {
    // Skip header rows (1-3)
    if (rowNumber <= 3) return

    // Column A: RDO name, Column B: Market, Column C: Site Number
    const rdoName = row.getCell(1).value?.toString().trim() || ''
    const market = row.getCell(2).value?.toString().trim() || ''
    const siteNumberRaw = row.getCell(3).value?.toString().trim()

    if (!siteNumberRaw) return

    // Skip rows that contain "Total" (case insensitive)
    if (
      rdoName.toLowerCase().includes('total') ||
      market.toLowerCase().includes('total') ||
      siteNumberRaw.toLowerCase().includes('total')
    ) {
      return
    }

    // Remove the "3" prefix and all following zeros (e.g., 3000004 → 4, 3000020 → 20)
    const siteNumber = siteNumberRaw.replace(/^3[0]*/, '')

    // Count this data row
    rowsReceived++

    // Initialize store if not exists
    if (!storesMap.has(siteNumber)) {
      storesMap.set(siteNumber, {
        id: siteNumber,
        lines: [],
        rydeUnits: 0,
        rydeSales: 0,
        rydeByUpc: new Map(),
      })
    }

    const store = storesMap.get(siteNumber)
    store.lines.push(rowNumber)

    // Process each item column
    for (const { col, itemNum, isUnits } of itemMapping) {
      // Only process RYDE items
      if (!RYDE_ITEMS.includes(itemNum)) continue

      const value = row.getCell(col).value
      let numValue = 0

      // Handle different cell value types
      if (typeof value === 'number') {
        numValue = value
      } else if (typeof value === 'object' && value !== null && 'result' in value) {
        numValue = parseFloat(value.result) || 0
      } else if (value) {
        numValue = parseFloat(value) || 0
      }

      if (numValue === 0) continue

      // Track by UPC (item number)
      if (!store.rydeByUpc.has(itemNum)) {
        store.rydeByUpc.set(itemNum, {
          product: `Circle K Item ${itemNum}`,
          units: 0,
          sales: 0,
        })
      }

      const upcData = store.rydeByUpc.get(itemNum)

      if (isUnits) {
        const units = parseInt(numValue) || 0
        upcData.units += units
        store.rydeUnits += units
      } else {
        const sales = numValue
        upcData.sales += sales
        store.rydeSales += sales
      }
    }
  })

  // Convert to expected output format (include all stores, even with 0 sales)
  const storesData = Array.from(storesMap.values()).map((store) => ({
      id: store.id,
      lines: store.lines,
      ryde: {
        sales: round(store.rydeSales, 2),
        units: store.rydeUnits,
        byUpc: Object.fromEntries(
          Array.from(store.rydeByUpc.entries())
            .filter(([upc, data]) => data.units > 0 || data.sales > 0)
            .map(([upc, data]) => [
              upc,
              {
                product: data.product,
                units: data.units,
                sales: round(data.sales, 2),
              },
            ]),
        ),
      },
      rom: {
        sales: 0,
        units: 0,
      },
    }))

  return { storesData, rowsReceived }
}

/**
 * Reorganizes store-based data into date-based data (same as Petro Canada)
 * @param {Array} weekData - Array of {date, storesData}
 * @returns {Array} Array of {date, sales: [{id, lines, ryde, rom}]}
 */
function reorganizeByDate(weekData) {
  return weekData.map(({ date, storesData }) => ({
    date,
    sales: storesData,
  }))
}
