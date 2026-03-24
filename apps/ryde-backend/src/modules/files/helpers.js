import config from 'config'

import first from 'lodash/first'

import AmazonS3Client from 'lib/FileDownloader/amazonS3'
import SFTP from 'lib/SFTP/sftp'

// Excel manipulation constants
const EXCEL_EPOCH = new Date(1899, 11, 30).getTime()
const MS_PER_DAY = 86400000

export async function getLatestRabbaInSFTP() {
  const sftp = new SFTP()

  const containerName = config.rabbaContainer
  const allBlobs = await sftp.getAllBlobs({ containerName })

  const availableBlobs = allBlobs.filter((blob) => blob.name !== 'rabba.txt')

  if (!availableBlobs.length) return []

  return availableBlobs
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((blob) => ({ ...blob, by: blob.name.includes('ADMIN') ? 'admin' : 'banner' }))
}

export async function getLatestFileInS3({ bucket }) {
  const clientInfos = {
    region: bucket.region,
    credentials: { accessKeyId: config.amazonS3.accessKeyId, secretAccessKey: config.amazonS3.secretAccessKey },
  }

  const s3Client = new AmazonS3Client({ clientInfos })
  const files = await s3Client.getAllFilesInContainer({ bucket: bucket.name })

  if (files.length) {
    const latestFiles = getLatestFiles({ files })
    return latestFiles
  }

  return []
}

function getLatestFiles({ files }) {
  const { adminFiles, bannerFiles } = files.reduce(
    (acc, file) => {
      if (file.name.includes('ADMIN')) return acc // return { ...acc, adminFiles: [...acc.adminFiles, file] }
      return { ...acc, bannerFiles: [...acc.bannerFiles, file] }
    },
    { adminFiles: [], bannerFiles: [] },
  )

  const availableFiles = []

  if (adminFiles.length) {
    const latestAdminFile = first(adminFiles.sort((a, b) => new Date(b.date) - new Date(a.date)))
    availableFiles.push({ ...latestAdminFile, by: 'admin' })
  }

  if (bannerFiles.length) {
    const sortedBannerFiles = bannerFiles.sort((a, b) => new Date(b.date) - new Date(a.date))
    for (const bf of sortedBannerFiles) {
      availableFiles.push({ ...bf, by: 'banner' })
    }
  }

  return availableFiles
}

/**
 * Excel Sheet Manipulation Helpers
 */

/**
 * Escape special XML characters to prevent malformed XML
 * @param {string|number|null|undefined} str - Value to escape
 * @returns {string} XML-safe string
 */
export function escapeXml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Convert a JavaScript Date to Excel serial date number
 * @param {Date} date - JavaScript Date object
 * @returns {number} Excel date serial number
 */
export function dateToExcelSerial(date) {
  return (date.getTime() - EXCEL_EPOCH) / MS_PER_DAY
}

/**
 * Convert column number to Excel letter (1 = A, 2 = B, ..., 27 = AA)
 * @param {number} colNum - Column number (1-based)
 * @returns {string} Column letter(s)
 */
export function columnNumberToLetter(colNum) {
  let letter = ''
  while (colNum > 0) {
    const remainder = (colNum - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    colNum = Math.floor((colNum - 1) / 26)
  }
  return letter
}

/**
 * Manage shared strings in Excel workbook
 * @param {string} sharedStringsXml - Original sharedStrings.xml content
 * @returns {Object} String manager with methods to get/add strings
 */
export function createStringManager(sharedStringsXml) {
  const siMatches = Array.from(sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g))
  const stringMap = new Map()
  const indexToString = new Map()

  // Parse existing strings
  for (let i = 0; i < siMatches.length; i++) {
    const tMatch = siMatches[i][1].match(/<t[^>]*>([^<]*)<\/t>/)
    if (tMatch) {
      const text = tMatch[1]
      stringMap.set(text, i)
      indexToString.set(i, text)
    }
  }

  const newStrings = []

  return {
    /**
     * Get or create string index for shared strings
     * @param {string} str - String to get index for
     * @returns {number} String index
     */
    getStringIndex: (str) => {
      const strValue = String(str)
      if (stringMap.has(strValue)) {
        const existingIndex = stringMap.get(strValue)
        // console.log(`Found existing string "${strValue}" at index ${existingIndex}`)
        return existingIndex
      }
      const newIndex = siMatches.length + newStrings.length
      newStrings.push(`<si><t>${escapeXml(strValue)}</t></si>`)
      stringMap.set(strValue, newIndex)
      return newIndex
    },

    /**
     * Get string by index
     * @param {number} index - String index
     * @returns {string|undefined} String value
     */
    getString: (index) => indexToString.get(index),

    /**
     * Get updated sharedStrings.xml content
     * @returns {string} Updated XML
     */
    getUpdatedXml: () => {
      if (newStrings.length === 0) return sharedStringsXml

      const countMatch = sharedStringsXml.match(/count="(\d+)"/)
      const uniqueCountMatch = sharedStringsXml.match(/uniqueCount="(\d+)"/)
      const currentCount = countMatch ? parseInt(countMatch[1]) : 0
      const currentUniqueCount = uniqueCountMatch ? parseInt(uniqueCountMatch[1]) : 0

      const sstOpenTag = sharedStringsXml.match(/<sst[^>]*>/)[0]
      const existingStrings = sharedStringsXml.match(/<sst[^>]*>([\s\S]*)<\/sst>/)[1]

      return (
        sstOpenTag
          .replace(/count="[^"]*"/, `count="${currentCount + newStrings.length}"`)
          .replace(/uniqueCount="[^"]*"/, `uniqueCount="${currentUniqueCount + newStrings.length}"`) +
        existingStrings +
        newStrings.join('') +
        '</sst>'
      )
    },

    /**
     * Check if new strings were added
     * @returns {boolean} True if strings were added
     */
    hasNewStrings: () => newStrings.length > 0,
  }
}

/**
 * Create an Excel cell with appropriate type and formatting
 * @param {string} cellRef - Cell reference (e.g., "A1")
 * @param {*} value - Cell value
 * @param {Object} stringManager - String manager from createStringManager()
 * @param {string|null} styleIndex - Style index for formatting
 * @returns {string} XML cell string
 */
export function createExcelCell(cellRef, value, stringManager, styleIndex = null) {
  const styleAttr = styleIndex ? ` s="${styleIndex}"` : ''

  // Empty cell
  if (value == null || value === '') {
    return `<c r="${cellRef}"/>`
  }

  // Date cell
  if (value instanceof Date) {
    const excelDate = dateToExcelSerial(value)
    const dateStyle = styleIndex || '1'
    return `<c r="${cellRef}" s="${dateStyle}"><v>${excelDate}</v></c>`
  }

  // Number cell
  if (typeof value === 'number') {
    return `<c r="${cellRef}"${styleAttr}><v>${value}</v></c>`
  }

  // String that looks entirely numeric (e.g., "123" or "123.45")
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
    const numValue = parseFloat(value)
    return `<c r="${cellRef}"${styleAttr}><v>${numValue}</v></c>`
  }

  // String value - use shared strings with explicit type
  return `<c r="${cellRef}" t="s"${styleAttr}><v>${stringManager.getStringIndex(value)}</v></c>`
}

/**
 * Create a new worksheet XML with data
 * @param {Array<Object>} data - Array of row objects
 * @param {Array<string>} headers - Column headers
 * @param {Object} stringManager - String manager from createStringManager()
 * @param {Object} options - Additional options
 * @param {string} options.sheetTitle - Title for row 1 (optional)
 * @param {boolean} options.autoFilter - Enable autoFilter (default: true)
 * @returns {string} Complete worksheet XML
 */
export function createWorksheetXml(data, headers, stringManager, options = {}) {
  const { sheetTitle = '', autoFilter = true } = options

  const rows = []
  let currentRow = 1

  // Add title row if provided
  if (sheetTitle) {
    const titleCell = createExcelCell('A1', sheetTitle, stringManager, '2')
    rows.push(`<row r="1">${titleCell}</row>`)
    currentRow++
  }

  // Add header row
  const headerCells = headers.map((header, idx) => {
    const colLetter = columnNumberToLetter(idx + 1)
    return createExcelCell(`${colLetter}${currentRow}`, header, stringManager, '1')
  })
  rows.push(`<row r="${currentRow}">${headerCells.join('')}</row>`)
  currentRow++

  // Add data rows
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i]
    const cells = []

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]
      const value = rowData[header]
      const colLetter = columnNumberToLetter(j + 1)
      const cellRef = `${colLetter}${currentRow}`

      cells.push(createExcelCell(cellRef, value, stringManager))
    }

    rows.push(`<row r="${currentRow}">${cells.join('')}</row>`)
    currentRow++
  }

  const lastRow = currentRow - 1
  const lastCol = columnNumberToLetter(headers.length)
  const headerRow = sheetTitle ? 2 : 1

  const autoFilterXml = autoFilter ? `<autoFilter ref="A${headerRow}:${lastCol}${lastRow}"/>` : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCol}${lastRow}"/>
  <sheetViews>
    <sheetView tabSelected="0" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A2" sqref="A2"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${rows.join('')}</sheetData>
  ${autoFilterXml}
</worksheet>`
}

/**
 * Remove a sheet from an existing Excel workbook
 * @param {JSZip} zip - JSZip instance with loaded workbook
 * @param {string} sheetName - Name of the sheet to remove
 */
export async function removeSheetFromWorkbook(zip, sheetName) {
  const workbookXml = await zip.file('xl/workbook.xml').async('string')

  // Find the sheet to remove
  const sheetRegex = new RegExp(
    `<sheet[^>]*name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*sheetId="(\\d+)"[^>]*r:id="(rId\\d+)"[^>]*/>`,
  )
  const sheetMatch = workbookXml.match(sheetRegex)

  if (!sheetMatch) {
    return
  }

  const rId = sheetMatch[2]

  // Find the sheet number from relationships
  const relsPath = 'xl/_rels/workbook.xml.rels'
  const relsXml = await zip.file(relsPath).async('string')
  const relRegex = new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="worksheets/(sheet\\d+)\\.xml"[^>]*/>`)
  const relMatch = relsXml.match(relRegex)

  if (relMatch) {
    const sheetFile = relMatch[1]

    // Remove the worksheet file
    zip.remove(`xl/worksheets/${sheetFile}.xml`)

    // Remove from workbook.xml
    const updatedWorkbookXml = workbookXml.replace(sheetRegex, '')
    zip.file('xl/workbook.xml', updatedWorkbookXml)

    // Remove from workbook.xml.rels
    const updatedRelsXml = relsXml.replace(relRegex, '')
    zip.file(relsPath, updatedRelsXml)

    // Remove from [Content_Types].xml
    const contentTypesXml = await zip.file('[Content_Types].xml').async('string')
    const contentTypeRegex = new RegExp(`<Override[^>]*PartName="/xl/worksheets/${sheetFile}\\.xml"[^>]*/>`)
    const updatedContentTypesXml = contentTypesXml.replace(contentTypeRegex, '')
    zip.file('[Content_Types].xml', updatedContentTypesXml)
  }
}

/**
 * Add a new sheet to an existing Excel workbook
 * @param {JSZip} zip - JSZip instance with loaded workbook
 * @param {string} sheetName - Name of the new sheet
 * @param {string} worksheetXml - Complete worksheet XML content
 * @returns {Object} Information about the new sheet
 */
export async function addSheetToWorkbook(zip, sheetName, worksheetXml) {
  // Remove existing sheet with same name if it exists
  await removeSheetFromWorkbook(zip, sheetName)

  // Read workbook.xml to find the next sheet ID
  const workbookXml = await zip.file('xl/workbook.xml').async('string')

  // Find existing sheets
  const sheetMatches = Array.from(
    workbookXml.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*sheetId="(\d+)"[^>]*r:id="(rId\d+)"/g),
  )

  const existingSheets = sheetMatches.map((match) => ({
    name: match[1],
    sheetId: parseInt(match[2]),
    rId: match[3],
  }))

  // Determine next IDs
  const nextSheetId = Math.max(...existingSheets.map((s) => s.sheetId), 0) + 1
  const nextSheetNum = existingSheets.length + 1

  // CRITICAL FIX: Find next available rId by checking ALL relationships, not just worksheets
  // The template has rId8, rId9, etc. used by pivot caches, slicers, etc.
  const relsPath = 'xl/_rels/workbook.xml.rels'
  const relsXml = await zip.file(relsPath).async('string')
  const allRIds = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => parseInt(m[1]))
  const nextRIdNum = allRIds.length > 0 ? Math.max(...allRIds) + 1 : 1
  const nextRId = `rId${nextRIdNum}`

  // Add worksheet file
  const worksheetPath = `xl/worksheets/sheet${nextSheetNum}.xml`
  zip.file(worksheetPath, worksheetXml)

  // Update workbook.xml to add sheet reference
  const newSheetXml = `<sheet name="${escapeXml(sheetName)}" sheetId="${nextSheetId}" r:id="${nextRId}"/>`
  const updatedWorkbookXml = workbookXml.replace(/(<sheets>[\s\S]*?)(<\/sheets>)/, `$1${newSheetXml}$2`)
  zip.file('xl/workbook.xml', updatedWorkbookXml)

  // Update workbook.xml.rels to add relationship (relsXml already loaded above)
  const newRelXml = `<Relationship Id="${nextRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${nextSheetNum}.xml"/>`
  const updatedRelsXml = relsXml.replace(/(<Relationships[^>]*>[\s\S]*?)(<\/Relationships>)/, `$1${newRelXml}$2`)
  zip.file(relsPath, updatedRelsXml)

  // Update [Content_Types].xml
  const contentTypesXml = await zip.file('[Content_Types].xml').async('string')
  const newOverrideXml = `<Override PartName="/xl/worksheets/sheet${nextSheetNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  const updatedContentTypesXml = contentTypesXml.replace(/(<Types[^>]*>[\s\S]*?)(<\/Types>)/, `$1${newOverrideXml}$2`)
  zip.file('[Content_Types].xml', updatedContentTypesXml)

  return {
    sheetId: nextSheetId,
    rId: nextRId,
    sheetNum: nextSheetNum,
    path: worksheetPath,
  }
}

/**
 * Create a table block within a worksheet
 * @param {Array<Object>} data - Array of row objects
 * @param {Array<string>} headers - Column headers
 * @param {Object} stringManager - String manager from createStringManager()
 * @param {number} startRow - Starting row number (1-based)
 * @param {number} startCol - Starting column number (1-based)
 * @param {Object} options - Additional options
 * @param {string} options.title - Table title (optional)
 * @param {string} options.titleStyle - Style index for title (default: '2')
 * @param {string} options.headerStyle - Style index for headers (default: '1')
 * @returns {Object} Table information including rows XML and dimensions
 */
export function createTableBlock(data, headers, stringManager, startRow, startCol, options = {}) {
  const { title = '', titleStyle = '2', headerStyle = '1' } = options

  const rows = []
  let currentRow = startRow

  // Add title row if provided
  if (title) {
    const titleColLetter = columnNumberToLetter(startCol)
    const titleCell = createExcelCell(`${titleColLetter}${currentRow}`, title, stringManager, titleStyle)
    rows.push(`<row r="${currentRow}">${titleCell}</row>`)
    currentRow++
  }

  // Add header row
  const headerCells = headers.map((header, idx) => {
    const colLetter = columnNumberToLetter(startCol + idx)
    return createExcelCell(`${colLetter}${currentRow}`, header, stringManager, headerStyle)
  })
  rows.push(`<row r="${currentRow}">${headerCells.join('')}</row>`)
  const headerRowNum = currentRow
  currentRow++

  // Add data rows
  for (let i = 0; i < data.length; i++) {
    const rowData = data[i]
    const cells = []

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]
      const value = rowData[header]
      const colLetter = columnNumberToLetter(startCol + j)
      const cellRef = `${colLetter}${currentRow}`

      cells.push(createExcelCell(cellRef, value, stringManager))
    }

    rows.push(`<row r="${currentRow}">${cells.join('')}</row>`)
    currentRow++
  }

  const endRow = currentRow - 1
  const endCol = startCol + headers.length - 1
  const startColLetter = columnNumberToLetter(startCol)
  const endColLetter = columnNumberToLetter(endCol)

  return {
    rows: rows.join(''),
    startRow: title ? startRow + 1 : startRow, // Header row position
    endRow,
    startCol,
    endCol,
    startColLetter,
    endColLetter,
    headerRowNum,
    nextAvailableRow: currentRow + 1, // Add spacing between tables
    autoFilterRef: `${startColLetter}${headerRowNum}:${endColLetter}${endRow}`,
  }
}

/**
 * Create a worksheet with multiple tables
 * @param {Array<Object>} tables - Array of table configurations
 * @param {Object} stringManager - String manager from createStringManager()
 * @param {Object} options - Additional options
 * @param {string} options.layout - Layout type: 'vertical' or 'horizontal' (default: 'vertical')
 * @param {number} options.spacing - Number of empty rows/columns between tables (default: 2)
 * @param {boolean} options.autoFilter - Enable autoFilter on each table (default: true)
 * @returns {string} Complete worksheet XML
 *
 * Table configuration object:
 * {
 *   data: Array<Object>,      // Row data
 *   headers: Array<string>,   // Column headers
 *   title: string,            // Optional table title
 *   titleStyle: string,       // Optional style index for title
 *   headerStyle: string       // Optional style index for headers
 * }
 */
export function createMultiTableWorksheetXml(tables, stringManager, options = {}) {
  const { layout = 'vertical', spacing = 2, autoFilter = true } = options

  const allRows = []
  const autoFilters = []
  let maxCol = 1
  let maxRow = 1

  if (layout === 'vertical') {
    // Stack tables vertically
    let currentRow = 1

    for (const table of tables) {
      const tableBlock = createTableBlock(
        table.data,
        table.headers,
        stringManager,
        currentRow,
        1, // Start at column A
        {
          title: table.title,
          titleStyle: table.titleStyle,
          headerStyle: table.headerStyle,
        },
      )

      allRows.push(tableBlock.rows)

      if (autoFilter) {
        autoFilters.push(tableBlock.autoFilterRef)
      }

      maxCol = Math.max(maxCol, tableBlock.endCol)
      maxRow = Math.max(maxRow, tableBlock.endRow)
      currentRow = tableBlock.nextAvailableRow + spacing
    }
  } else if (layout === 'horizontal') {
    // Place tables side by side
    let currentCol = 1

    for (const table of tables) {
      const tableBlock = createTableBlock(
        table.data,
        table.headers,
        stringManager,
        1, // Start at row 1
        currentCol,
        {
          title: table.title,
          titleStyle: table.titleStyle,
          headerStyle: table.headerStyle,
        },
      )

      allRows.push(tableBlock.rows)

      if (autoFilter) {
        autoFilters.push(tableBlock.autoFilterRef)
      }

      maxCol = Math.max(maxCol, tableBlock.endCol)
      maxRow = Math.max(maxRow, tableBlock.endRow)
      currentCol = tableBlock.endCol + spacing + 1
    }
  }

  const lastColLetter = columnNumberToLetter(maxCol)

  // Generate column definitions with appropriate widths
  const colsXml = Array.from({ length: maxCol }, (_, i) => {
    const colNum = i + 1
    const width = colNum === 1 ? 25 : 15 // First column wider for labels
    return `<col min="${colNum}" max="${colNum}" width="${width}" customWidth="1"/>`
  }).join('')

  // Note: Excel only supports one autoFilter per sheet
  // If multiple tables, we'll only apply autoFilter to the first table
  const autoFilterXml = autoFilter && autoFilters.length > 0 ? `<autoFilter ref="${autoFilters[0]}"/>` : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColLetter}${maxRow}"/>
  <sheetViews>
    <sheetView tabSelected="0" workbookViewId="0">
      <selection activeCell="A1" sqref="A1"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${colsXml}</cols>
  <sheetData>${allRows.join('')}</sheetData>
  ${autoFilterXml}
</worksheet>`
}

/**
 * Complete example: Add a new sheet with data to an Excel file
 * @param {JSZip} zip - JSZip instance with loaded workbook
 * @param {string} sheetName - Name of the new sheet
 * @param {Array<Object>} data - Array of row objects
 * @param {Array<string>} headers - Column headers (keys from data objects)
 * @param {Object} options - Additional options
 * @returns {Object} Information about the new sheet
 */
export async function addDataSheetToWorkbook(zip, sheetName, data, headers, options = {}) {
  // Load and manage shared strings
  const sharedStringsPath = 'xl/sharedStrings.xml'
  const sharedStringsXml = await zip.file(sharedStringsPath).async('string')
  const stringManager = createStringManager(sharedStringsXml)

  // Create worksheet XML with data
  const worksheetXml = createWorksheetXml(data, headers, stringManager, options)

  // Add sheet to workbook
  const sheetInfo = await addSheetToWorkbook(zip, sheetName, worksheetXml)

  // Update shared strings if new strings were added
  if (stringManager.hasNewStrings()) {
    zip.file(sharedStringsPath, stringManager.getUpdatedXml())
  }

  return sheetInfo
}

/**
 * Add a new sheet with multiple tables to an Excel file
 * @param {JSZip} zip - JSZip instance with loaded workbook
 * @param {string} sheetName - Name of the new sheet
 * @param {Array<Object>} tables - Array of table configurations
 * @param {Object} options - Additional options (layout, spacing, autoFilter)
 * @returns {Object} Information about the new sheet
 */
export async function addMultiTableSheetToWorkbook(zip, sheetName, tables, options = {}) {
  // Load and manage shared strings
  const sharedStringsPath = 'xl/sharedStrings.xml'
  const sharedStringsXml = await zip.file(sharedStringsPath).async('string')
  const stringManager = createStringManager(sharedStringsXml)

  // Create worksheet XML with multiple tables
  const worksheetXml = createMultiTableWorksheetXml(tables, stringManager, options)

  // Add sheet to workbook
  const sheetInfo = await addSheetToWorkbook(zip, sheetName, worksheetXml)

  // Update shared strings if new strings were added
  if (stringManager.hasNewStrings()) {
    zip.file(sharedStringsPath, stringManager.getUpdatedXml())
  }

  return sheetInfo
}
