import Excel from 'exceljs'
import moment from 'moment'

// Helper function to round to 2 decimal places
const round = (num, decimals = 2) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)

// Petro Canada brand identifiers
const RYDE_BRANDS = ['RYDE']
const ROM_BRANDS = ['5 HOUR', '5 HOUR ENERGY', 'DOSE'] // ROM includes only 5 HOUR and Dose

/**
 * Parses a Petro Canada Excel file with the same signature as parseParklandSellOut
 * @param {Object} params
 * @param {Stream} params.stream - File stream
 * @param {Array} params.expected - Expected sheets configuration (not used, kept for compatibility)
 * @param {Array} params.optional - Optional columns (not used, kept for compatibility)
 * @returns {Promise<Object>} {data: Array of {date, sales: [{id, lines, ryde, rom}]}, totalRowsReceived: number}
 */
export async function parsePetroCanadaSellOut({ stream, expected, optional = [] }) {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  const unitSalesSheet = workbook.getWorksheet('Unit Sales')
  const dollarSalesSheet = workbook.getWorksheet('$ Sales')

  if (!unitSalesSheet) {
    throw new Error('Missing Unit Sales sheet in the workbook')
  }
  if (!dollarSalesSheet) {
    throw new Error('Missing $ Sales sheet in the workbook')
  }

  // Find and extract dates from header row (dynamically search for it)
  const dates = findAndExtractDates(unitSalesSheet)

  // Parse all rows to build store data
  const { storesData, totalRowsReceived } = parseStoreData(unitSalesSheet, dollarSalesSheet, dates)

  // Reorganize by date
  const dateData = reorganizeByDate(storesData, dates)

  return {
    data: dateData,
    totalRowsReceived,
  }
}

/**
 * Finds the date row and extracts dates from it
 * Searches for a row containing the date pattern "January 6, 2025, Wk 1, Unit Sales"
 * Returns array of {date, columnNumber, dateRowNumber}
 */
function findAndExtractDates(sheet) {
  const dates = []
  let dateRowNumber = null

  // Search through rows to find the date header row
  // Typically it's around row 28 but can vary, so we search rows 1-50
  for (let rowNum = 1; rowNum <= 50; rowNum++) {
    const row = sheet.getRow(rowNum)

    // Check if this row contains date headers
    // Look for the pattern in column J (10) or nearby columns
    for (let colNum = 8; colNum <= 15; colNum++) {
      const cell = row.getCell(colNum)
      const value = cell.value

      if (typeof value === 'string') {
        // Check if it matches the date pattern: "January 6, 2025, Wk 1, Unit Sales"
        const match = value.match(/^(\w+ \d+, \d{4}),\s*Wk\s*\d+/)
        if (match) {
          dateRowNumber = rowNum
          break
        }
      }
    }

    if (dateRowNumber) break
  }

  // If we didn't find a date row, throw an error
  if (!dateRowNumber) {
    throw new Error('Could not find date header row in Unit Sales sheet')
  }

  const dateRow = sheet.getRow(dateRowNumber)

  // Extract all dates from this row
  // Start at column J (10) - columns 1-9 are metadata
  for (let colNum = 10; colNum <= 100; colNum++) {
    const cell = dateRow.getCell(colNum)
    const value = cell.value

    if (!value) break // Stop when we hit empty cells

    if (typeof value === 'string') {
      // Parse format: "January 6, 2025, Wk 1, Unit Sales"
      const match = value.match(/^(\w+ \d+, \d{4})/)
      if (match) {
        const dateStr = match[1] // e.g., "January 6, 2025"
        let date = moment.utc(dateStr, 'MMMM D, YYYY')

        if (date.isValid()) {
          // Convert to the Monday of the previous week
          const dayOfWeek = date.day()
          if (dayOfWeek === 0) {
            // Sunday -> move back 6 days to get to Monday, then back 7 more days for previous week
            date = date.subtract(13, 'days')
          } else {
            // Any day (including Monday) -> move back to Monday of current week, then back 7 more days
            date = date.subtract(dayOfWeek - 1 + 7, 'days')
          }

          dates.push({ date: date.format('YYYY-MM-DD'), columnNumber: colNum, dateRowNumber })
        }
      }
    }
  }

  return dates
}

/**
 * Parses the sheets to extract store data
 */
function parseStoreData(unitSalesSheet, dollarSalesSheet, dates) {
  const storesMap = new Map()
  let totalRowsReceived = 0

  // Get the date row number to know where data rows start
  const dateRowNumber = dates.length > 0 ? dates[0].dateRowNumber : 28
  const dataStartRow = dateRowNumber + 1 // Data starts right after the date row

  unitSalesSheet.eachRow((row, rowNumber) => {
    // Skip header and date rows
    if (rowNumber <= dataStartRow) return

    // Column layout:
    // Column 1: Item (product name)
    // Column 2: UPC
    // Column 5: Brand
    // Column 8: Site name
    // Column 9: Store Number
    const productName = row.getCell(1).value?.toString().trim()
    const upc = row.getCell(2).value?.toString().trim()
    const brand = row.getCell(5).value?.toString().trim()
    const siteName = row.getCell(8).value?.toString().trim()
    const storeNumber = row.getCell(9).value?.toString().trim()

    // Skip empty rows or Total rows
    if (!brand || !storeNumber || !productName || productName === 'Total') return

    // Determine if this is RYDE or ROM
    const isRyde = RYDE_BRANDS.some((b) => brand.toUpperCase().includes(b))
    const isRom = ROM_BRANDS.some((b) => brand.toUpperCase().includes(b))

    // Skip brands that are neither RYDE nor ROM
    if (!isRyde && !isRom) return

    // Count this data row
    totalRowsReceived++

    // Initialize store if not exists
    if (!storesMap.has(storeNumber)) {
      storesMap.set(storeNumber, {
        id: storeNumber,
        lines: [],
        salesByDate: new Map(),
      })
    }

    const store = storesMap.get(storeNumber)
    store.lines.push(rowNumber)

    // Get the corresponding row from dollar sales sheet
    const dollarRow = dollarSalesSheet.getRow(rowNumber)

    // For each date, extract units and sales
    for (const { date, columnNumber } of dates) {
      const units = parseInt(row.getCell(columnNumber).value) || 0
      const sales = parseFloat(dollarRow.getCell(columnNumber).value) || 0

      if (!store.salesByDate.has(date)) {
        store.salesByDate.set(date, {
          date,
          rydeUnits: 0,
          rydeSales: 0,
          rydeByUpc: new Map(),
          romUnits: 0,
          romSales: 0,
          romByBrand: new Map(), // Track ROM by brand
        })
      }

      const dateSales = store.salesByDate.get(date)

      if (isRyde) {
        dateSales.rydeUnits += units
        dateSales.rydeSales += sales

        // Track by UPC
        if (upc) {
          if (!dateSales.rydeByUpc.has(upc)) {
            dateSales.rydeByUpc.set(upc, {
              product: productName,
              units: 0,
              sales: 0,
            })
          }
          const upcData = dateSales.rydeByUpc.get(upc)
          upcData.units += units
          upcData.sales += sales
        }
      } else if (isRom) {
        dateSales.romUnits += units
        dateSales.romSales += sales

        // Track ROM by brand
        const brandKey = brand.toUpperCase().includes('5 HOUR') ? '5 hour' : 'Dose'
        if (!dateSales.romByBrand.has(brandKey)) {
          dateSales.romByBrand.set(brandKey, {
            units: 0,
            sales: 0,
          })
        }
        const brandData = dateSales.romByBrand.get(brandKey)
        brandData.units += units
        brandData.sales += sales
      }
    }
  })

  // Convert to array format
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
            .filter(([upc, data]) => data.units > 0)
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
        sales: round(s.romSales, 2),
        units: s.romUnits,
        salesByBrand: Object.fromEntries(
          Array.from(s.romByBrand.entries())
            .filter(([, data]) => data.units > 0)
            .map(([brand, data]) => [
              brand,
              {
                units: data.units,
                sales: round(data.sales, 2),
              },
            ]),
        ),
      },
    })),
  }))

  return { storesData, totalRowsReceived }
}

/**
 * Reorganizes store-based data into date-based data
 * @param {Array} storesData - Array of {id: storeId, lines: [row numbers], sales: [{date, ryde, rom}]}
 * @param {Array} dates - Array of {date, columnNumber}
 * @returns {Array} Array of {date, sales: [{id, lines, ryde, rom}]}
 */
function reorganizeByDate(storesData, dates) {
  const dateMap = {}

  // Initialize dateMap with all dates
  for (const { date } of dates) {
    dateMap[date] = {
      date,
      sales: [],
    }
  }

  // Populate sales for each date
  for (const store of storesData) {
    for (const daySale of store.sales) {
      if (dateMap[daySale.date]) {
        dateMap[daySale.date].sales.push({
          id: store.id,
          lines: store.lines,
          ryde: daySale.ryde,
          rom: daySale.rom,
        })
      }
    }
  }

  // Convert to array
  return Object.values(dateMap)
}
