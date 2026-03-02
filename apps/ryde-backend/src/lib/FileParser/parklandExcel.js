import Excel from 'exceljs'
import isDate from 'lodash/isDate'
import isObject from 'lodash/isObject'
import round from 'lodash/round'
import moment from 'moment'

// Canadian provinces and territories - these should NOT be treated as brands
const CANADIAN_PROVINCES = [
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
]

/**
 * Parses a Parkland Excel file with the same signature as readExcelFile
 * @param {Object} params
 * @param {Stream} params.stream - File stream
 * @param {Array} params.expected - Expected sheets configuration (not used, kept for compatibility)
 * @param {Array} params.optional - Optional columns (not used, kept for compatibility)
 * @returns {Promise<Object>} {data: Array of {date, sales: [{id, lines, ryde, rom}]}, totalRowsReceived: number}
 */
export async function parseParklandSellOut({ stream, expected, optional = [] }) {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  const sheet = workbook.getWorksheet('Data')
  if (!sheet) {
    throw new Error('Missing Data in the workbook')
  }

  // Extract dates from row 4
  const dateRow = sheet.getRow(4)
  const dates = extractDates(dateRow)

  // Parse all rows to build store data
  const { storesData, totalRowsReceived } = parseStoreData(sheet, dates)

  // Reorganize by date
  const dateData = reorganizeByDate(storesData, dates)

  return {
    data: dateData,
    totalRowsReceived,
  }
}

/**
 * Extracts dates from the header row
 * Dates appear every 3 columns starting at column C (3)
 */
function extractDates(dateRow) {
  const dates = []

  // Start at column C (3), then every 3 columns: 3, 6, 9, 12, 15, 18...
  // Continue until we hit empty cells or a "Total" column
  for (let colNum = 3; colNum <= dateRow.cellCount; colNum += 3) {
    const cell = dateRow.getCell(colNum)
    const value = cell.value

    if (!value) break // Stop when we hit empty cells

    // Check if it's a "Total" or other non-date column
    if (typeof value === 'string' && value.toLowerCase().includes('total')) {
      break
    }

    let date
    if (isDate(value)) {
      date = moment.utc(value)
    } else if (isObject(value) && value.result && isDate(value.result)) {
      date = moment.utc(value.result)
    } else if (typeof value === 'string') {
      // Parse M/D/YYYY format
      date = moment.utc(value, 'M/D/YYYY')
    }

    if (date && date.isValid()) {
      // If the date is a Sunday (day = 0), move to the next day (Monday)
      if (date.day() === 0) {
        date = date.add(1, 'day')
      }

      dates.push({ date: date.format('YYYY-MM-DD'), columnNumber: colNum })
    }
  }

  return dates
}

/**
 * Parses the sheet to extract store data
 */
function parseStoreData(sheet, dates) {
  const storesData = []
  let currentStore = null
  let currentStoreProducts = []
  let currentStoreLines = []
  let shouldStop = false
  let totalRowsReceived = 0

  sheet.eachRow((row, rowNumber) => {
    // Skip header rows (rows 1-5)
    if (rowNumber <= 5) return

    // Stop processing if we've hit a footer/total row
    if (shouldStop) return

    // Column B (2) contains the row label (store ID or product name)
    const rowLabel = row.getCell(2).value?.toString().trim()

    if (!rowLabel) return

    // Check for footer/total rows (case insensitive)
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

    // Skip province rows - they are NOT brands and should not be processed
    if (CANADIAN_PROVINCES.includes(rowLabel.toUpperCase())) {
      return
    }

    // Skip category header rows (e.g., "Alternative Pkgd Bvgs")
    if (rowLabel === 'Alternative Pkgd Bvgs' || rowLabel === 'Row Labels') {
      return
    }

    // Check if this is a store ID (numeric string)
    if (isStoreId(rowLabel)) {
      // Count this data row
      totalRowsReceived++

      // Save previous store if exists
      if (currentStore) {
        const storeSales = aggregateStoreSales(currentStoreProducts, dates)
        storesData.push({
          id: currentStore,
          lines: currentStoreLines,
          sales: storeSales,
        })
      }

      // Start new store
      currentStore = rowLabel
      currentStoreProducts = []
      currentStoreLines = [rowNumber]
    } else if (currentStore) {
      // This is a product row under the current store - count it
      totalRowsReceived++
      currentStoreLines.push(rowNumber)
      const productData = extractProductData(row, rowLabel, dates)
      if (productData) {
        currentStoreProducts.push(productData)
      }
    }
  })

  // Don't forget the last store
  if (currentStore && currentStoreProducts.length > 0) {
    const storeSales = aggregateStoreSales(currentStoreProducts, dates)
    storesData.push({
      id: currentStore,
      lines: currentStoreLines,
      sales: storeSales,
    })
  }

  return { storesData, totalRowsReceived }
}

/**
 * Checks if a value looks like a store ID (numeric string)
 */
function isStoreId(value) {
  // Store IDs are numeric strings like "40001", "40002"
  return /^\d+$/.test(value)
}

/**
 * Extracts product sales data for all dates
 */
function extractProductData(row, productName, dates) {
  const productData = {
    name: productName,
    brand: productName, // Store the brand name
    isRyde: productName.toUpperCase().includes('RYDE'),
    salesByDate: {},
  }

  // For each date, extract sales and units
  for (const { date, columnNumber } of dates) {
    const sales = parseFloat(row.getCell(columnNumber).value) || 0 // Sales $ column
    const units = parseInt(row.getCell(columnNumber + 1).value) || 0 // Unit Sales column

    productData.salesByDate[date] = { sales, units }
  }

  return productData
}

/**
 * Aggregates products into RYDE vs ROM (rest of market) for each date
 */
function aggregateStoreSales(products, dates) {
  const salesByDate = []

  for (const { date } of dates) {
    let rydeSales = 0
    let rydeUnits = 0
    let romSales = 0
    let romUnits = 0
    const romByBrand = {}

    for (const product of products) {
      const dateSales = product.salesByDate[date]
      if (!dateSales) continue

      if (product.isRyde) {
        rydeSales += dateSales.sales
        rydeUnits += dateSales.units
      } else {
        romSales += dateSales.sales
        romUnits += dateSales.units

        // Track sales by brand for ROM
        const brand = product.brand
        if (!romByBrand[brand]) {
          romByBrand[brand] = {
            sales: 0,
            units: 0,
          }
        }
        romByBrand[brand].sales += dateSales.sales
        romByBrand[brand].units += dateSales.units
      }
    }

    // Round all brand sales values
    const salesByBrand = {}
    for (const [brand, data] of Object.entries(romByBrand)) {
      // Only include brands with non-zero sales or units
      if (data.sales !== 0 || data.units !== 0) {
        salesByBrand[brand] = {
          sales: round(data.sales, 2),
          units: data.units,
        }
      }
    }

    salesByDate.push({
      date,
      ryde: {
        sales: round(rydeSales, 2),
        units: rydeUnits,
      },
      rom: {
        sales: round(romSales, 2),
        units: romUnits,
        salesByBrand,
      },
    })
  }

  return salesByDate
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
