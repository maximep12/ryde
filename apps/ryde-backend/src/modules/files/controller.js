import config from 'config'

import snakeCase from 'lodash/snakeCase'

import AmazonS3Client from 'lib/FileDownloader/amazonS3'
import { downloadLatestS3File } from 'lib/FileDownloader/download'
import SFTP from 'lib/SFTP/sftp'

import { getLatestFileInS3, getLatestRabbaInSFTP, createStringManager } from './helpers'
import { BANNERS } from 'utils/constants'

import ReplenOrderConfirmed from 'models/replenOrderConfirmed'

import JSZip from 'jszip'
import path from 'path'
import { promises as fs } from 'fs'
import { syncCustomersLocation } from '../customers/controller'
import groupBy from 'lodash/groupBy'
import sortBy from 'lodash/sortBy'
import sumBy from 'lodash/sumBy'

const HEADERS = {
  rowLabel: 'Row Labels',
  storesPurchasing: '# of Stores Purchasing',
  totalStores: 'Total Stores',
  reorder: 'Re-order %',
  actuals: 'Actuals',
  target: 'Target',
  vsTarget: '% vs Target',
  sellinStoreWeek: 'Sell-In x Store x Week',
}

export async function downloadLastCircleK(ctx) {
  try {
    const bucket = config.amazonS3.buckets.circleK
    const fileLocation = await downloadLatestS3File({ bucket, path: 'temp/downloads/circleK' })

    ctx.body = { fileLocation }
  } catch (e) {
    ctx.throw(400, e)
  }
}

export async function downloadLastRabba(ctx) {
  const { container } = ctx.params
  try {
    const sftp = new SFTP()

    const fileLocation = await sftp.downloadLatestBlob({ containerName: container })

    ctx.body = { fileLocation }
  } catch (error) {
    ctx.throw(400, error.message)
  }
}

export async function getLatestStoredFiles(ctx) {
  try {
    const latestRabbaInSFTP = await getLatestRabbaInSFTP()
    const latestRabbaInS3 = await getLatestFileInS3({ bucket: config.amazonS3.buckets.rabba })
    const latestCircleKInS3 = await getLatestFileInS3({ bucket: config.amazonS3.buckets.circleK })

    ctx.body = {
      sftp: { rabba: latestRabbaInSFTP },
      s3: { rabba: latestRabbaInS3, circleK: latestCircleKInS3 },
    }
  } catch (error) {
    const { code } = error
    return ctx.throw(code ?? 400, error)
  }
}

export async function downloadBannerReport(ctx) {
  try {
    const { banner, provider, fileName } = ctx.params
    const circleK = snakeCase(BANNERS.CIRCLE_K.global)
    const rabba = snakeCase(BANNERS.RABBA)
    const supportedS3Banners = [circleK, rabba]
    const supportedSFTPBanners = [rabba]

    if (provider === 'S3') {
      if (!supportedS3Banners.includes(banner)) throw new Error(`Banner not supported by S3: ${banner}`)

      const bucket = banner === circleK ? config.amazonS3.buckets.circleK : config.amazonS3.buckets.rabba

      const clientInfos = {
        region: bucket.region,
        credentials: { accessKeyId: config.amazonS3.accessKeyId, secretAccessKey: config.amazonS3.secretAccessKey },
      }
      const s3Client = new AmazonS3Client({ clientInfos })
      const files = await s3Client.getAllFilesInContainer({ bucket: bucket.name })

      const fileExists = files.some((f) => f.name === fileName)
      if (!fileExists) throw new Error('File does not exist.')

      const content = await s3Client.getS3Content({ key: fileName, bucket: bucket.name })
      ctx.body = content
      return
    }
    if (provider === 'SFTP') {
      if (!supportedSFTPBanners.includes(banner)) throw new Error(`Banner not supported by SFTP: ${banner}`)

      const sftpClient = new SFTP()
      const containerName = config.rabbaContainer
      const availableBlobs = await sftpClient.getAllBlobs({ containerName })
      const fileExists = availableBlobs.some((blob) => blob.name === fileName)
      if (!fileExists) throw new Error('File does not exist.')

      const content = await sftpClient.getBlobContent({ containerName, blobName: fileName })
      ctx.body = content
      return
    }

    throw new Error('File is unavailable. Please validate the banner, the provider and the file name.')
  } catch (error) {
    const { code } = error
    return ctx.throw(code ?? 400, error)
  }
}

/**
 * STEP 1: Get data from database
 */
async function getWeeklyTargetsData() {
  // Optimized query: aggregate at the weekly level directly instead of daily cross join
  // This reduces the Cartesian product from customers × 58 days to customers × 9 weeks
  const query = `WITH
  date_ranges AS (
    SELECT
      date_trunc('week', date)::date AS week_start,
      UPPER(TO_CHAR(date_trunc('month', date), 'Mon')) AS month,
      'W' || CEIL(EXTRACT(DAY FROM date_trunc('week', date)::date) / 7.0)::int AS week_num
    FROM
      available_dates
    WHERE
      date BETWEEN '2025-11-03' AND '2025-12-31'
    GROUP BY
      date_trunc('week', date)::date,
      date_trunc('month', date)
  ),
  weekly_sales AS (
    SELECT
      r.customer_id AS id,
      date_trunc('week', r.document_date::date)::date AS week_start,
      SUM(r.confirmed_quantity) AS quantity
    FROM
      replen_orders_confirmed r
    WHERE
      r.document_date::date BETWEEN '2025-11-03' AND '2025-12-31'
    GROUP BY
      r.customer_id,
      date_trunc('week', r.document_date::date)::date
  ),
  customer_weekly_data AS (
    SELECT
      c.id,
      c.bat_id,
      c.banner,
      c.advance_region_name,
      c.advance_district_name,
      c.advance_territory_name,
      c.advance_rep_name AS rep,
      dr.week_start,
      dr.month,
      dr.week_num,
      c.confirmed_target,
      c.confirmed_target::numeric / 9 AS weekly_target,
      COALESCE(ws.quantity, 0) AS quantity
    FROM
      customers c
      CROSS JOIN date_ranges dr
      LEFT JOIN weekly_sales ws
        ON ws.id = c.id
        AND ws.week_start = dr.week_start
  )
SELECT
  id AS "S4H ID",
  bat_id AS "BAT ID",
  banner AS "Banner",
  advance_region_name AS "Region",
  advance_district_name AS "District",
  advance_territory_name AS "Territory",
  rep AS "Rep",
  week_start AS "Week Start Day",
  month AS "Month",
  week_num AS "Week",
  quantity AS "Weekly quantity",
  weekly_target AS "Weekly target",
  confirmed_target AS "Period Target"
FROM
  customer_weekly_data
ORDER BY
  "Week Start Day" ASC, id ASC;
`

  const { rows: weeklyTargets } = await ReplenOrderConfirmed.knex().raw(query)

  // Validate row count to prevent timeouts (Excel max is 1,048,576 rows)
  if (weeklyTargets.length === 0) {
    throw new Error('No data returned from query')
  }

  if (weeklyTargets.length > 100000) {
    throw new Error(`Dataset too large: ${weeklyTargets.length} rows. Maximum 100,000 rows allowed.`)
  }

  return weeklyTargets
}

/**
 * STEP 2: Update the Sell-In Database sheet
 */
async function updateSellInDatabaseSheet(zip, weeklyTargets) {
  const sheetPath = 'xl/worksheets/sheet5.xml'
  let sheetXml = await zip.file(sheetPath).async('string')

  // Extract row 1 (title) and row 2 (headers) from the existing sheet
  const sheetDataMatch = sheetXml.match(/<sheetData[^>]*>([\s\S]*?)<\/sheetData>/)
  const existingSheetData = sheetDataMatch[1]

  const row1Match = existingSheetData.match(/<row r="1"[^>]*>[\s\S]*?<\/row>/)
  const row2Match = existingSheetData.match(/<row r="2"[^>]*>[\s\S]*?<\/row>/)

  const row1 = row1Match ? row1Match[0] : ''
  const row2 = row2Match ? row2Match[0] : ''

  // Read shared strings
  const sharedStringsPath = 'xl/sharedStrings.xml'
  const sharedStringsXml = await zip.file(sharedStringsPath).async('string')
  const stringManager = createStringManager(sharedStringsXml)

  // Extract headers from row 2
  const headerCells = Array.from(row2.matchAll(/<c r="([A-Z]+)2"[^>]*>[\s\S]*?<v>(\d+)<\/v>[\s\S]*?<\/c>/g))
  const templateHeaders = []
  const headerColLetters = []
  const headerStyleIndices = []

  const indexToString = new Map()
  const siMatches = Array.from(sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g))
  for (let i = 0; i < siMatches.length; i++) {
    const tMatch = siMatches[i][1].match(/<t[^>]*>([^<]*)<\/t>/)
    if (tMatch) {
      indexToString.set(i, tMatch[1])
    }
  }

  for (const match of headerCells) {
    const colLetter = match[1]
    const stringIndex = parseInt(match[2])
    const headerText = indexToString.get(stringIndex)

    if (headerText) {
      templateHeaders.push(headerText)
      headerColLetters.push(colLetter)
      headerStyleIndices.push(null)
    }
  }

  // Extract style indices from row 3 (first data row in template) to preserve formatting
  const row3Match = existingSheetData.match(/<row r="3"[^>]*>[\s\S]*?<\/row>/)
  if (row3Match) {
    const row3 = row3Match[0]
    for (let i = 0; i < headerColLetters.length; i++) {
      const colLetter = headerColLetters[i]
      const styleMatch = row3.match(new RegExp(`<c r="${colLetter}3"[^>]*s="(\\d+)"`))
      if (styleMatch) {
        headerStyleIndices[i] = styleMatch[1]
      }
    }
  }

  // Map query keys to template headers
  const queryKeys = Object.keys(weeklyTargets[0] || {})
  const headerMapping = templateHeaders.map((header) => queryKeys.find((key) => key === header))

  // Build new data rows
  const dataRows = []
  const EXCEL_EPOCH = new Date(1899, 11, 30).getTime()
  const MS_PER_DAY = 86400000

  for (let i = 0; i < weeklyTargets.length; i++) {
    const rowNum = i + 3
    const rowData = weeklyTargets[i]
    const cells = []

    for (let j = 0; j < headerMapping.length; j++) {
      const headerKey = headerMapping[j]
      let value = headerKey ? rowData[headerKey] : null
      const cellRef = `${headerColLetters[j]}${rowNum}`
      const styleIndex = headerStyleIndices[j]

      if (value == null || value === '') {
        cells.push(`<c r="${cellRef}"/>`)
      } else if (value instanceof Date) {
        const excelDate = (value.getTime() - EXCEL_EPOCH) / MS_PER_DAY
        const dateStyle = styleIndex || '1'
        cells.push(`<c r="${cellRef}" s="${dateStyle}"><v>${excelDate}</v></c>`)
      } else if (typeof value === 'number') {
        cells.push(`<c r="${cellRef}"><v>${value}</v></c>`)
      } else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
        const numValue = parseFloat(value)
        cells.push(`<c r="${cellRef}"><v>${numValue}</v></c>`)
      } else {
        cells.push(`<c r="${cellRef}" t="s"><v>${stringManager.getStringIndex(value)}</v></c>`)
      }
    }

    dataRows.push(`<row r="${rowNum}">${cells.join('')}</row>`)
  }

  // Update sheet data
  const newSheetData = `<sheetData>${row1}${row2}${dataRows.join('')}</sheetData>`
  sheetXml = sheetXml.replace(/<sheetData[^>]*>[\s\S]*?<\/sheetData>/, newSheetData)

  // Update dimension
  const lastRow = 2 + weeklyTargets.length
  const lastCol = headerColLetters[headerColLetters.length - 1]
  sheetXml = sheetXml.replace(/<dimension[^>]*\/>/, `<dimension ref="A1:${lastCol}${lastRow}"/>`)

  // Update autoFilter
  sheetXml = sheetXml.replace(/<autoFilter[^>]*ref="[^"]*"([^>]*)\/>/, `<autoFilter ref="A2:${lastCol}${lastRow}"$1/>`)

  zip.file(sheetPath, sheetXml)

  // Update shared strings if needed
  if (stringManager.hasNewStrings()) {
    zip.file(sharedStringsPath, stringManager.getUpdatedXml())
  }
}

/**
 * Helper function to create Excel Table XML definition
 * @param {number} tableId - Unique table ID (e.g., 1, 2, 3)
 * @param {string} tableName - Table name (e.g., "Table1", "Table2")
 * @param {string} displayName - Display name (e.g., "BannerReorder")
 * @param {string} ref - Cell range (e.g., "A1:D10")
 * @param {Array<string>} headers - Column headers
 * @param {string} styleId - Table style ID (e.g., "TableStyleMedium5")
 * @returns {string} XML string for table definition
 */
function createTableXml(tableId, tableName, displayName, ref, headers, styleId = 'TableStyleMedium5') {
  const columns = headers
    .map(
      (header, idx) =>
        `<tableColumn id="${idx + 1}" name="${header
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}"/>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${tableId}" name="${tableName}" displayName="${displayName}" ref="${ref}" totalsRowShown="0">
  <autoFilter ref="${ref}"/>
  <tableColumns count="${headers.length}">
${columns}
  </tableColumns>
  <tableStyleInfo name="${styleId}" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`
}

/**
 * STEP 3: Create the Accumulated sheet by building XML directly
 * This approach uses the existing stringManager to avoid appending strings at the end
 */
async function createAccumulatedSheet(zip, weeklyTargets) {
  // Load shared strings and create string manager
  const sharedStringsPath = 'xl/sharedStrings.xml'
  const sharedStringsXml = await zip.file(sharedStringsPath).async('string')
  const stringManager = createStringManager(sharedStringsXml)

  // Helper function to convert column index to letter
  const getColLetter = (col) => {
    let letter = ''
    let num = col
    while (num >= 0) {
      letter = String.fromCharCode(65 + (num % 26)) + letter
      num = Math.floor(num / 26) - 1
    }
    return letter
  }

  // Helper function to create a table at a specific position
  const createTable = (title, headers, data, startRow, startCol, isRatioTable = false) => {
    const tableRows = []
    let currentRow = startRow

    // Title row with bold style
    const titleCell = `${getColLetter(startCol)}${currentRow}`
    const titleIndex = stringManager.getStringIndex(title)
    tableRows.push({ row: currentRow, cells: [`<c r="${titleCell}" t="s" s="29"><v>${titleIndex}</v></c>`] })
    currentRow++

    // Add '# of Weeks' row for ratio tables
    const weeksRowNum = isRatioTable ? currentRow : null
    if (isRatioTable) {
      const weeksLabelCell = `${getColLetter(startCol)}${currentRow}`
      const weeksLabelIndex = stringManager.getStringIndex('# of Weeks')
      const value1Cell = `${getColLetter(startCol + 1)}${currentRow}`
      const value9Cell = `${getColLetter(startCol + 2)}${currentRow}`

      tableRows.push({
        row: currentRow,
        cells: [
          `<c r="${weeksLabelCell}" t="s" s="57"><v>${weeksLabelIndex}</v></c>`,
          `<c r="${value1Cell}" s="56"><v>1</v></c>`,
          `<c r="${value9Cell}" s="56"><v>9</v></c>`,
        ],
      })
      currentRow++
    } else {
      // Blank row for non-ratio tables
      currentRow++
    }

    // Store the header row for table definition
    const headerRow = currentRow

    // Header row
    const headerCells = headers.map((header, i) => {
      const col = getColLetter(startCol + i)
      const strIndex = stringManager.getStringIndex(header)
      let styleIdx
      if (isRatioTable) {
        // Ratio table: first column s="47", others s="48"
        styleIdx = i === 0 ? '47' : '48'
      } else {
        // Reorder table: all headers use green fill style
        styleIdx = '30' // All headers have green background
      }
      return `<c r="${col}${currentRow}" t="s" s="${styleIdx}"><v>${strIndex}</v></c>`
    })
    tableRows.push({ row: currentRow, cells: headerCells })
    currentRow++

    // Data rows
    data.forEach((rowData) => {
      const cells = []

      // All columns: data (no title in first column)
      headers.forEach((header, idx) => {
        const cellRef = `${getColLetter(startCol + idx)}${currentRow}`
        const value = rowData[header]

        if (value == null || value === '') {
          cells.push(`<c r="${cellRef}"/>`)
        } else if (idx === 3 && (header === HEADERS.vsTarget || header === HEADERS.reorder)) {
          // Percentage column for both reorder and ratio tables
          if (!isRatioTable && header === HEADERS.reorder) {
            // Re-order % table: formula divides column 2 (stores purchasing) by column 3 (total stores)
            const storesPurchasingCell = `${getColLetter(startCol + 1)}${currentRow}`
            const totalStoresCell = `${getColLetter(startCol + 2)}${currentRow}`
            const formula = `IFERROR(${storesPurchasingCell}/${totalStoresCell},0)`
            // Calculate initial value from the stored percentage string
            const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) / 100 : value / 100
            cells.push(`<c r="${cellRef}" s="43"><f>${formula}</f><v>${numValue}</v></c>`)
          } else if (isRatioTable && header === HEADERS.vsTarget) {
            // Ratio table: formula divides Actuals by Target
            const actualsCell = `${getColLetter(startCol + 1)}${currentRow}`
            const targetCell = `${getColLetter(startCol + 2)}${currentRow}`
            const formula = `IFERROR(${actualsCell}/${targetCell},0)`
            const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) / 100 : value / 100
            cells.push(`<c r="${cellRef}" s="53"><f>${formula}</f><v>${numValue}</v></c>`)
          } else {
            // Fallback for static percentage values
            const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) / 100 : value / 100
            cells.push(`<c r="${cellRef}" s="${isRatioTable ? '53' : '43'}"><v>${numValue}</v></c>`)
          }
        } else if (typeof value === 'number') {
          // For ratio tables, Actuals column (index 1) should use a formula
          if (isRatioTable && idx === 1 && header === HEADERS.actuals) {
            // Formula: divide the raw value by the weeks value in row 2 (first cell), rounded to 1 decimal
            const weeksCell = `${getColLetter(startCol + 1)}${weeksRowNum}`
            const formula = `ROUND(${value}/${weeksCell},1)`
            // Use style 58 for ratio table numbers (has 1 decimal format)
            cells.push(`<c r="${cellRef}" s="58"><f>${formula}</f><v>${value}</v></c>`)
          } else if (isRatioTable && idx === 2 && header === HEADERS.target) {
            // Formula: divide the raw value by the weeks value in row 2 (second cell - the 9), rounded to 1 decimal
            const weeksCell = `${getColLetter(startCol + 2)}${weeksRowNum}`
            const formula = `ROUND(${value}/${weeksCell},1)`
            // Use style 58 for ratio table numbers (has 1 decimal format)
            cells.push(`<c r="${cellRef}" s="58"><f>${formula}</f><v>${value}</v></c>`)
          } else {
            // Regular number - style 32 for reorder tables, no specific style for ratio table first numbers
            cells.push(`<c r="${cellRef}" s="32"><v>${value}</v></c>`)
          }
        } else {
          // First column (row labels) uses different styles for ratio vs reorder tables
          const strIndex = stringManager.getStringIndex(String(value))
          const style = idx === 0 ? (isRatioTable ? ' s="49"' : ' s="31"') : ''
          cells.push(`<c r="${cellRef}" t="s"${style}><v>${strIndex}</v></c>`)
        }
      })

      tableRows.push({ row: currentRow, cells })
      currentRow++
    })

    // Calculate table range (header row to last data row)
    const tableStartCell = `${getColLetter(startCol)}${headerRow}`
    const tableEndCell = `${getColLetter(startCol + headers.length - 1)}${currentRow - 1}`
    const tableRange = `${tableStartCell}:${tableEndCell}`

    return {
      rows: tableRows,
      endRow: currentRow - 1,
      endCol: startCol + headers.length - 1,
      tableRange, // Add table range for Excel Table definition
      headerRow, // Add header row position
    }
  }

  // Calculate metrics for each grouping
  const { reorder: bannerReorder, ratio: bannerRatio } = calculateMetricsByGroup(weeklyTargets, 'Banner')
  const { reorder: regionReorder, ratio: regionRatio } = calculateMetricsByGroup(weeklyTargets, 'Region')
  const { reorder: districtReorder, ratio: districtRatio } = calculateMetricsByGroup(weeklyTargets, 'District')
  const { reorder: territoryReorder, ratio: territoryRatio } = calculateMetricsByGroup(weeklyTargets, 'Territory')

  // Define 8 tables in 2-column layout
  const tables = [
    { title: `Banner ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: bannerReorder, isRatio: false },
    { title: `Banner ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: bannerRatio, isRatio: true },
    { title: `Region ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: regionReorder, isRatio: false },
    { title: `Region ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: regionRatio, isRatio: true },
    { title: `District ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: districtReorder, isRatio: false },
    { title: `District ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: districtRatio, isRatio: true },
    { title: `Territory ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: territoryReorder, isRatio: false },
    { title: `Territory ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: territoryRatio, isRatio: true },
  ]

  // Layout: 2 columns, 4 rows (4 tables per column)
  const allRows = new Map() // Map<rowNum, cells[]>
  let maxRow = 0
  let maxCol = 0
  const excelTables = [] // Store table information for creating Excel Table definitions

  const TABLE_SPACING = 2 // Blank rows between tables
  const COLUMN_SPACING = 1 // Blank columns between table columns
  const TABLE_WIDTH = 4 // Each table uses 4 data columns

  tables.forEach((table, idx) => {
    const columnIndex = idx % 2 // 0 for left column, 1 for right column
    const tableRow = Math.floor(idx / 2) // Which horizontal row of tables (0-3)

    // Calculate starting position
    const startCol = columnIndex * (TABLE_WIDTH + COLUMN_SPACING)

    // Calculate starting row based on previous table rows
    let startRow = 1
    for (let i = 0; i < tableRow; i++) {
      // For each previous row of tables, find the maximum height
      const leftTableIdx = i * 2
      const rightTableIdx = i * 2 + 1

      const leftExtraRows = tables[leftTableIdx].isRatio ? 3 : 3 // Both have 3 rows (title + blank/weeks + header)
      const rightExtraRows = tables[rightTableIdx].isRatio ? 3 : 3

      const leftHeight = tables[leftTableIdx].data.length + leftExtraRows
      const rightHeight = tables[rightTableIdx].data.length + rightExtraRows

      // Use the maximum height of the two tables in this row
      startRow += Math.max(leftHeight, rightHeight) + TABLE_SPACING
    }

    // Create table
    const result = createTable(table.title, table.headers, table.data, startRow, startCol, table.isRatio)

    // Add cells to rows map
    result.rows.forEach(({ row, cells }) => {
      if (!allRows.has(row)) {
        allRows.set(row, [])
      }
      allRows.get(row).push(...cells)
    })

    // Store table information for Excel Table creation
    excelTables.push({
      range: result.tableRange,
      headers: table.headers,
      displayName: table.title.replace(/[^a-zA-Z0-9]/g, ''), // Remove special characters for table name
      isRatio: table.isRatio, // Track table type for color styling
    })

    maxRow = Math.max(maxRow, result.endRow)
    maxCol = Math.max(maxCol, result.endCol)
  })

  // Build rows XML
  const rowsXml = Array.from(allRows.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rowNum, cells]) => `<row r="${rowNum}">${cells.join('')}</row>`)

  // Build table parts XML for referencing Excel Tables
  const tableParts = excelTables.map((_, idx) => `    <tablePart r:id="rId${idx + 1}"/>`).join('\n')

  // Build complete sheet XML with table parts
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${getColLetter(maxCol)}${maxRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <selection activeCell="A1" sqref="A1"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="25" customWidth="1"/>
    <col min="2" max="2" width="20" customWidth="1"/>
    <col min="3" max="3" width="15" customWidth="1"/>
    <col min="4" max="4" width="15" customWidth="1"/>
    <col min="6" max="6" width="25" customWidth="1"/>
    <col min="7" max="7" width="20" customWidth="1"/>
    <col min="8" max="8" width="15" customWidth="1"/>
    <col min="9" max="9" width="15" customWidth="1"/>
  </cols>
  <sheetData>
${rowsXml.join('\n')}
  </sheetData>
  <tableParts count="${excelTables.length}">
${tableParts}
  </tableParts>
</worksheet>`

  // Check if Accumulated sheet already exists and reuse its sheet number
  const workbookXml = await zip.file('xl/workbook.xml').async('string')
  const accumulatedMatch = workbookXml.match(/<sheet[^>]*name="Accumulated"[^>]*r:id="(rId\d+)"[^>]*\/>/)

  let sheetNum = 8 // Default sheet number

  if (accumulatedMatch) {
    // Reuse existing sheet - find its worksheet file
    const rId = accumulatedMatch[1]
    const relsPath = 'xl/_rels/workbook.xml.rels'
    let relsXml = await zip.file(relsPath).async('string')

    // Remove ALL existing relationships with this rId (there might be duplicates)
    const rIdPattern = new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*/>`, 'g')
    const existingRels = relsXml.match(rIdPattern) || []

    // Determine sheet number (default to sheet8)
    for (const rel of existingRels) {
      const worksheetMatch = rel.match(/worksheets\/sheet(\d+)\.xml/)
      if (worksheetMatch) {
        sheetNum = parseInt(worksheetMatch[1])
        break
      }
    }

    // Remove ALL existing rId relationships
    relsXml = relsXml.replace(rIdPattern, '')

    // Add the NEW relationship pointing to the worksheet (only once)
    const newRelXml = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNum}.xml"/>`

    // Insert before the closing </Relationships> tag
    relsXml = relsXml.replace('</Relationships>', `${newRelXml}</Relationships>`)

    // Write updated relationships
    zip.file(relsPath, relsXml)

    // Write the sheet XML
    zip.file(`xl/worksheets/sheet${sheetNum}.xml`, sheetXml)
  } else {
    // Add as new sheet
    const { addSheetToWorkbook } = require('./helpers')
    await addSheetToWorkbook(zip, 'Accumulated', sheetXml)
  }

  // Create Excel Table XML files for each table (runs for both if/else branches)
  const sheetRelsPath = `xl/worksheets/_rels/sheet${sheetNum}.xml.rels`
  let sheetRelsXml = zip.file(sheetRelsPath) ? await zip.file(sheetRelsPath).async('string') : null

  // If no relationships file exists, create one
  if (!sheetRelsXml) {
    sheetRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
  }

  // Find the next available table ID by checking existing table files
  let nextTableId = 1
  const existingTables = []
  const tablesFolder = zip.folder('xl/tables')
  if (tablesFolder) {
    tablesFolder.forEach((relativePath) => {
      if (relativePath.match(/^table(\d+)\.xml$/)) {
        const match = relativePath.match(/^table(\d+)\.xml$/)
        const tableNum = parseInt(match[1])
        existingTables.push(tableNum)
        nextTableId = Math.max(nextTableId, tableNum + 1)
      }
    })
  }

  // Create table XML files and add relationships
  excelTables.forEach((tableInfo, idx) => {
    const tableNum = nextTableId + idx

    // Use exact same styles as By Banner pivot tables
    // Re-order % tables (isRatio: false) = TableStyleMedium7 (matches PivotStyleMedium7)
    // Sell-In x Store x Week tables (isRatio: true) = TableStyleMedium5 (matches PivotStyleMedium5)
    const tableStyle = tableInfo.isRatio ? 'TableStyleMedium5' : 'TableStyleMedium7'

    const tableXml = createTableXml(
      tableNum,
      `Table${tableNum}`,
      tableInfo.displayName,
      tableInfo.range,
      tableInfo.headers,
      tableStyle,
    )

    // Write table XML file
    zip.file(`xl/tables/table${tableNum}.xml`, tableXml)

    // Add relationship in sheet rels file
    const tableRel = `<Relationship Id="rId${
      idx + 1
    }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${tableNum}.xml"/>`
    sheetRelsXml = sheetRelsXml.replace('</Relationships>', `${tableRel}\n</Relationships>`)
  })

  // Write sheet relationships file
  zip.file(sheetRelsPath, sheetRelsXml)

  // Update [Content_Types].xml to include table content types
  let contentTypesXml = await zip.file('[Content_Types].xml').async('string')

  // Add table content type if not already present
  if (!contentTypesXml.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml')) {
    const tableOverride = `<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`
    contentTypesXml = contentTypesXml.replace('</Types>', `${tableOverride}\n</Types>`)
  }

  // Add overrides for each new table
  excelTables.forEach((_, idx) => {
    const tableNum = nextTableId + idx
    const partName = `/xl/tables/table${tableNum}.xml`

    // Only add if not already present
    if (!contentTypesXml.includes(partName)) {
      const tableOverride = `<Override PartName="${partName}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`
      contentTypesXml = contentTypesXml.replace('</Types>', `${tableOverride}\n</Types>`)
    }
  })

  zip.file('[Content_Types].xml', contentTypesXml)

  // Update shared strings with any new strings added by stringManager
  if (stringManager.hasNewStrings()) {
    zip.file(sharedStringsPath, stringManager.getUpdatedXml())
  }
}

/**
 * STEP 5: Fix pivot cache definitions to prevent corruption
 * Pivot tables with external data model connections need proper refreshedDate
 * Setting saveData="0" and recordCount="0" forces Excel to refresh from source
 * This prevents the "empty cacheSource" corruption issue
 */
async function fixPivotCacheDefinitions(zip) {
  // Get current date as Excel serial number
  const now = new Date()
  const EXCEL_EPOCH = new Date(1899, 11, 30).getTime()
  const MS_PER_DAY = 86400000
  const excelDate = (now.getTime() - EXCEL_EPOCH) / MS_PER_DAY

  // Update all pivot cache definitions with external connections
  const pivotCacheFiles = []
  zip.folder('xl/pivotCache').forEach((relativePath) => {
    if (relativePath.startsWith('pivotCacheDefinition') && relativePath.endsWith('.xml')) {
      pivotCacheFiles.push(relativePath)
    }
  })

  for (const cacheFile of pivotCacheFiles) {
    let cacheXml = await zip.file(`xl/pivotCache/${cacheFile}`).async('string')

    // Update refreshedDate to current date to prevent Excel from flagging as stale
    cacheXml = cacheXml.replace(/refreshedDate="[^"]*"/, `refreshedDate="${excelDate}"`)

    // CRITICAL: Ensure saveData="0" - tells Excel not to use cached data
    if (!cacheXml.includes('saveData="0"')) {
      cacheXml = cacheXml.replace(/<pivotCacheDefinition([^>]*)>/, '<pivotCacheDefinition$1 saveData="0">')
    }

    // Set recordCount to 0 to force Excel to refresh from source
    cacheXml = cacheXml.replace(/recordCount="\d+"/, 'recordCount="0"')

    // Remove any orphaned pivotCacheRecords references
    // These can cause corruption when the data has changed
    const recordsPath = cacheFile.replace('pivotCacheDefinition', 'pivotCacheRecords')
    if (zip.file(`xl/pivotCache/${recordsPath}`)) {
      zip.remove(`xl/pivotCache/${recordsPath}`)
      // Update the cache definition to remove the records relationship
      cacheXml = cacheXml.replace(/<pivotCacheRecords[^>]*\/>/, '')
    }

    zip.file(`xl/pivotCache/${cacheFile}`, cacheXml)
  }
}

/**
 * Main controller function with 5 clear steps:
 * 1. Get data from database
 * 2. Load template with JSZip (preserves slicers/pivots)
 * 3. Update Sell-In Database sheet (adds banner names and other strings first)
 * 4. Add Accumulated sheet (reuses strings from step 3)
 * 5. Fix pivot cache definitions
 * 6. Return the file
 */
export async function getPeriodTargetsFile(ctx) {
  try {
    // STEP 1: Get updated data from database
    await syncCustomersLocation()
    const weeklyTargets = await getWeeklyTargetsData()

    // STEP 2: Load template with JSZip (to preserve slicers/pivots)
    const templatePath = path.join(
      process.cwd(),
      'templates',
      'Sell-In Actuals vs Target Performance - Up to 11.09.2025.xlsx',
    )
    const templateBuffer = await fs.readFile(templatePath)
    const zip = await JSZip.loadAsync(templateBuffer)

    // STEP 2.5: Pre-populate shared strings with Accumulated sheet strings
    // This prevents them from being added at the end after all other operations
    const sharedStringsPath = 'xl/sharedStrings.xml'
    let sharedStringsXml = await zip.file(sharedStringsPath).async('string')

    // Add Accumulated sheet strings (headers + all possible percentages 0-100%)
    const accumulatedStrings = [
      'Banner Re-order %',
      'Row Labels',
      '# of Stores Purchasing',
      'Total Stores',
      'Re-order %',
      '# of Weeks',
    ]

    // Add all possible percentage values (0% to 100%)
    // This prevents dynamic percentages from being added at the end
    for (let i = 0; i <= 100; i++) {
      accumulatedStrings.push(`${i}%`)
    }

    const existingCountMatch = sharedStringsXml.match(/uniqueCount="(\d+)"/)
    const existingCount = existingCountMatch ? parseInt(existingCountMatch[1]) : 0

    // Create string elements for Accumulated sheet
    const newStringElements = accumulatedStrings
      .map((str) => `<si><t>${str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`)
      .join('')

    // Insert new strings BEFORE the closing </sst> tag
    sharedStringsXml = sharedStringsXml.replace(/<\/sst>/, `${newStringElements}</sst>`)

    // Update counts
    const newTotal = existingCount + accumulatedStrings.length
    sharedStringsXml = sharedStringsXml.replace(/count="\d+"/, `count="${newTotal}"`)
    sharedStringsXml = sharedStringsXml.replace(/uniqueCount="\d+"/, `uniqueCount="${newTotal}"`)

    // Write updated shared strings back
    zip.file(sharedStringsPath, sharedStringsXml)

    // STEP 3: Update Sell-In Database sheet
    // Strings are added but Accumulated strings are already in place
    await updateSellInDatabaseSheet(zip, weeklyTargets)

    // STEP 4: Add Accumulated sheet
    // Will reuse the pre-populated strings instead of adding them at the end
    await createAccumulatedSheet(zip, weeklyTargets)

    // STEP 5: Fix pivot cache definitions to prevent corruption
    await fixPivotCacheDefinitions(zip)

    // STEP 6: Return the file
    const finalBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    ctx.attachment('Sell-In Actuals vs Target Performance - UPDATED.xlsx')
    ctx.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ctx.body = finalBuffer
  } catch (error) {
    const { code } = error
    return ctx.throw(code ?? 400, error)
  }
}

const REORDER_HEADERS = [HEADERS.rowLabel, HEADERS.storesPurchasing, HEADERS.totalStores, HEADERS.reorder]
const RATIO_HEADERS = [HEADERS.rowLabel, HEADERS.actuals, HEADERS.target, HEADERS.vsTarget]

/**
 * Calculate reorder and ratio metrics for a given grouping key
 * @param {Array} data - The weekly targets data
 * @param {string} groupKey - The field to group by (e.g., 'Banner', 'Region')
 * @returns {Object} Object containing reorder and ratio arrays
 */
const calculateMetricsByGroup = (data, groupKey) => {
  const groupedData = groupBy(data, groupKey)
  const sortedEntries = sortBy(Object.entries(groupedData), ([label]) => label)

  return sortedEntries.reduce(
    (acc, [label, groupData]) => {
      const storesWithOrders = new Set()
      const totalStores = new Set()
      const uniqueStoreTargets = new Map()

      for (const row of groupData) {
        const storeId = row['S4H ID']
        totalStores.add(storeId)

        // Track unique store targets (only count each store once)
        if (!uniqueStoreTargets.has(storeId)) {
          uniqueStoreTargets.set(storeId, row['Period Target'])
        }

        if (row['Weekly quantity'] > 0) {
          storesWithOrders.add(storeId)
        }
      }

      const ordered = storesWithOrders.size
      const total = totalStores.size

      // Sum targets only once per store
      const totalTarget = Array.from(uniqueStoreTargets.values()).reduce((sum, target) => sum + target, 0)
      const totalActuals = sumBy(groupData, (n) => Number(n['Weekly quantity']))

      const ratioActuals = ordered !== 0 ? Number((totalActuals / ordered).toFixed(1)) : 0
      const ratioTarget = total !== 0 ? Number((totalTarget / total).toFixed(1)) : 0
      const ratioVsTarget = ratioTarget !== 0 ? Number(((ratioActuals / ratioTarget) * 100).toFixed(1)) : 0

      return {
        reorder: [
          ...acc.reorder,
          {
            [HEADERS.rowLabel]: label,
            [HEADERS.storesPurchasing]: ordered,
            [HEADERS.totalStores]: total,
            [HEADERS.reorder]: Math.floor((ordered / total) * 100) + '%',
          },
        ],
        ratio: [
          ...acc.ratio,
          {
            [HEADERS.rowLabel]: label,
            [HEADERS.actuals]: ratioActuals,
            [HEADERS.target]: ratioTarget,
            [HEADERS.vsTarget]: ratioVsTarget + '%',
          },
        ],
      }
    },
    { reorder: [], ratio: [] },
  )
}
