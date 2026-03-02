import Excel from 'exceljs'
import moment from 'moment'

// Helper function to round to 2 decimal places
const round = (num, decimals = 2) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)

/**
 * Parses a 7-Eleven Excel file with the same signature as parseParklandSellOut
 * @param {Object} params
 * @param {Stream} params.stream - File stream
 * @param {Array} params.expected - Expected sheets configuration (not used, kept for compatibility)
 * @param {Array} params.optional - Optional columns (not used, kept for compatibility)
 * @returns {Promise<Object>} {data: {date, sales: [{id, lines, ryde, rom}]}, totalRowsReceived: number}
 */
export async function parseSevenElevenSellOut({ stream, expected, optional = [] }) {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  const sheet = workbook.getWorksheet('Data')
  if (!sheet) {
    throw new Error('Missing Data sheet in the workbook')
  }

  // Extract date from row 8, column 2
  const dateRow = sheet.getRow(8)
  const dateCell = dateRow.getCell(2)
  const date = extractDate(dateCell.value)

  // Extract product information from rows 9-10
  const productRow = sheet.getRow(9)
  const typeRow = sheet.getRow(10)
  const products = extractProducts(productRow, typeRow)

  // Parse store data starting from row 11
  const { storesData, totalRowsReceived } = parseStoreData(sheet, products, date)

  // Format output to match expected structure (single date object, not array)
  return {
    data: {
      date,
      sales: storesData,
    },
    totalRowsReceived,
  }
}

/**
 * Extracts date from header cell
 * Expected format: "Calendar Month Ending MM-DD-YYYY"
 */
function extractDate(value) {
  if (!value) {
    throw new Error('No date found in header')
  }

  const dateStr = value.toString()
  // Parse format: "Calendar Month Ending 08-31-2025"
  const match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/)

  if (!match) {
    throw new Error(`Could not parse date from: ${dateStr}`)
  }

  const [, month, day, year] = match
  const date = moment.utc(`${year}-${month}-${day}`, 'YYYY-MM-DD').format('YYYY-MM-DD')

  if (!moment(date, 'YYYY-MM-DD').isValid()) {
    throw new Error(`Invalid date: ${date}`)
  }

  return date
}

/**
 * Extracts product information from header rows
 * Row 9 contains: "SLIN :221782 RYDE RELAXWELLBEINGSHOTS60ML"
 * Row 10 contains: "Unit Sales" or "Dollar Sales"
 * Returns array of {columnNumber, slin, product, isUnits}
 */
function extractProducts(productRow, typeRow) {
  const products = []

  // Start at column 2 (column 1 is Geography)
  for (let colNum = 2; colNum <= 100; colNum++) {
    const productValue = productRow.getCell(colNum).value
    const typeValue = typeRow.getCell(colNum).value

    if (!productValue || !typeValue) break

    const productStr = productValue.toString()
    const typeStr = typeValue.toString()

    // Extract SLIN number from format "SLIN :221782 RYDE RELAXWELLBEINGSHOTS60ML"
    const slinMatch = productStr.match(/SLIN\s*:(\d+)/)
    if (!slinMatch) continue

    const slin = slinMatch[1]
    const product = productStr // Keep full product description

    // Determine if this is Unit Sales or Dollar Sales
    const isUnits = typeStr.toLowerCase().includes('unit')

    products.push({
      columnNumber: colNum,
      slin,
      product,
      isUnits,
    })
  }

  return products
}

/**
 * Parses store data from the sheet
 * Each row represents a store with columns for each product's unit sales and dollar sales
 */
function parseStoreData(sheet, products, date) {
  const storesMap = new Map()
  let totalRowsReceived = 0

  sheet.eachRow((row, rowNumber) => {
    // Data starts at row 11
    if (rowNumber < 11) return

    // Column 1 contains store ID with address (e.g., "14812 1339 NORTHMOUNT DR NW CALGARY AB T2L 0C9")
    const storeInfo = row.getCell(1).value?.toString().trim()

    if (!storeInfo) return

    // Extract store ID (first part before space)
    const storeIdMatch = storeInfo.match(/^(\d+)/)
    if (!storeIdMatch) return

    const storeId = storeIdMatch[1]

    // Count this data row
    totalRowsReceived++

    // Initialize store if not exists
    if (!storesMap.has(storeId)) {
      storesMap.set(storeId, {
        id: storeId,
        lines: [],
        rydeUnits: 0,
        rydeSales: 0,
        rydeByUpc: new Map(),
      })
    }

    const store = storesMap.get(storeId)
    store.lines.push(rowNumber)

    // Group products by SLIN (UPC) to get both units and sales
    const productDataMap = new Map()

    for (const product of products) {
      const value = row.getCell(product.columnNumber).value
      const numValue = parseFloat(value) || 0

      if (numValue === 0) continue

      if (!productDataMap.has(product.slin)) {
        productDataMap.set(product.slin, {
          slin: product.slin,
          product: product.product,
          units: 0,
          sales: 0,
        })
      }

      const productData = productDataMap.get(product.slin)

      if (product.isUnits) {
        productData.units = parseInt(numValue) || 0
      } else {
        productData.sales = numValue
      }
    }

    // Aggregate into store totals
    for (const [slin, data] of productDataMap.entries()) {
      store.rydeUnits += data.units
      store.rydeSales += data.sales

      // Track by UPC/SLIN
      if (!store.rydeByUpc.has(slin)) {
        store.rydeByUpc.set(slin, {
          product: data.product,
          units: 0,
          sales: 0,
        })
      }

      const upcData = store.rydeByUpc.get(slin)
      upcData.units += data.units
      upcData.sales += data.sales
    }
  })

  // Convert to expected output format
  const storesData = Array.from(storesMap.values()).map((store) => ({
    id: store.id,
    lines: store.lines,
    ryde: {
      sales: round(store.rydeSales, 2),
      units: store.rydeUnits,
      byUpc: Object.fromEntries(
        Array.from(store.rydeByUpc.entries())
          .filter(([slin, data]) => data.units > 0)
          .map(([slin, data]) => [
            slin,
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

  return { storesData, totalRowsReceived }
}

/**
 * Parses a 7-Eleven WH to Store Excel file (SSR_001 format)
 * @param {Object} params
 * @param {Stream} params.stream - File stream
 * @returns {Promise<Object>} {dateRange: {start, end}, salesByCustomer: [{customerId, products: [{itemCode, description, upc, pack, size, quantity, amount}]}]}
 */
export async function parseSevenElevenWHToStore({ stream }) {
  const workbook = new Excel.Workbook()
  await workbook.xlsx.read(stream)

  const sheet = workbook.getWorksheet('SSR_001')
  if (!sheet) {
    throw new Error('Missing SSR_001 sheet in the workbook')
  }

  // Extract date range from row 6
  const dateRange = extractDateRange(sheet)

  // Parse sales data by customer starting from row 18
  const { salesByCustomer, totalRowsReceived } = parseWHToStoreSalesData(sheet)

  return {
    dateRange,
    salesByCustomer,
    totalRowsReceived,
  }
}

/**
 * Extracts date range from row 6
 * Expected format: "2025-12-01  -  2025-12-07"
 */
function extractDateRange(sheet) {
  const row6 = sheet.getRow(6)

  // Find the date range cell (typically column F/6)
  let dateRangeStr = null
  row6.eachCell((cell) => {
    const value = cell.value?.toString().trim()
    if (value && value.includes(' - ')) {
      dateRangeStr = value
    }
  })

  if (!dateRangeStr) {
    throw new Error('Could not find date range in row 6')
  }

  // Parse format: "2025-12-01  -  2025-12-07"
  const parts = dateRangeStr.split(/\s+-\s+/)
  if (parts.length !== 2) {
    throw new Error(`Could not parse date range from: ${dateRangeStr}`)
  }

  const start = moment.utc(parts[0].trim(), 'YYYY-MM-DD').format('YYYY-MM-DD')
  const end = moment.utc(parts[1].trim(), 'YYYY-MM-DD').format('YYYY-MM-DD')

  if (!moment(start, 'YYYY-MM-DD').isValid() || !moment(end, 'YYYY-MM-DD').isValid()) {
    throw new Error(`Invalid date range: ${start} - ${end}`)
  }

  return { start, end }
}

/**
 * Parses WH to Store sales data
 * Structure:
 * - Store ID row (6-digit number)
 * - Category row (e.g., "HEALTH & BEAUTY")
 * - Product rows (Item code, Description, UPC, Pack, Size, Quantity, Amount)
 * - TOTAL:Category row
 * - TOTAL:StoreID row
 */
function parseWHToStoreSalesData(sheet) {
  const customersMap = new Map()
  let currentCustomerId = null
  let totalRowsReceived = 0

  sheet.eachRow((row, rowNumber) => {
    // Data starts at row 18
    if (rowNumber < 18) return

    const values = row.values.slice(1) // Remove first empty element

    // Get the value at column 7 (index 6) which contains either store ID or product description
    const col7Value = values[6]?.toString().trim()

    if (!col7Value) return

    // Skip category rows (e.g., "HEALTH & BEAUTY")
    if (col7Value === 'HEALTH & BEAUTY') return

    // Check if it's a store ID row (6-digit number only)
    const storeIdMatch = col7Value.match(/^(\d{6})\s*$/)
    if (storeIdMatch) {
      // Remove leading zeros from customer ID
      currentCustomerId = parseInt(storeIdMatch[1], 10).toString()
      if (!customersMap.has(currentCustomerId)) {
        customersMap.set(currentCustomerId, {
          customerId: currentCustomerId,
          products: [],
        })
      }
      return
    }

    // Skip TOTAL rows
    if (col7Value.startsWith('TOTAL:')) return

    // This should be a product row - extract data
    if (currentCustomerId) {
      const itemCode = values[4]?.toString().trim() // Column E (index 4)
      const description = col7Value // Column G (index 6)
      const upc = values[12]?.toString().trim() // Column M (index 12)
      const pack = values[15] // Column P (index 15)
      const size = values[16]?.toString().trim() // Column Q (index 16)
      const quantity = values[17] // Column R (index 17)
      const amount = values[18] // Column S (index 18)

      // Only add if we have valid product data
      if (itemCode && description && quantity !== undefined) {
        totalRowsReceived++
        const customer = customersMap.get(currentCustomerId)
        customer.products.push({
          rowNumber,
          itemCode,
          description,
          upc: upc || null,
          pack: pack || null,
          size: size || null,
          quantity: typeof quantity === 'number' ? quantity : parseFloat(quantity) || 0,
          amount: typeof amount === 'number' ? round(amount, 2) : round(parseFloat(amount) || 0, 2),
        })
      }
    }
  })

  return { salesByCustomer: Array.from(customersMap.values()), totalRowsReceived }
}
