import { uploadedFiles } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { desc, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import JSZip from 'jszip'
import groupBy from 'lodash/groupBy.js'
import sortBy from 'lodash/sortBy.js'
import sumBy from 'lodash/sumBy.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { config } from '../../config'
import { db } from '../../db'
import { ContextVariables } from '../../index'
import { AmazonS3Client, downloadLatestS3File } from '../../lib/FileDownloader/s3'
import { requireRoles } from '../../middlewares/auth'
import { syncCustomersLocation } from '../customers/helpers'
import { createStringManager } from './helpers'

const logger = createBaseLogger().child({ module: 'files' })

const tokenIsValid = requireRoles('admin', 'data_manager')

const BANNERS = {
  CIRCLE_K: { global: 'circle_k', slug: 'circlek' },
  RABBA: { global: 'rabba', slug: 'rabba' },
}

const S3_BUCKET = { name: config.s3.bucket, region: config.s3.region }
const bannerPrefix = config.s3.bannerPrefix

const PERIOD_TARGETS_TEMPLATE = 'Sell-In Actuals vs Target Performance - Up to 11.09.2025.xlsx'

const filesRouter = new Hono<{ Variables: ContextVariables }>()

export const filesRouterDefinition = filesRouter

  /**
   * GET /download/circleK — Download the latest CircleK file from S3
   */
  .get('/circleK', tokenIsValid, async (c) => {
    try {
      const fileLocation = await downloadLatestS3File({
        bucket: S3_BUCKET,
        prefix: bannerPrefix(BANNERS.CIRCLE_K.slug),
        path: 'temp/downloads/circleK',
        accessKeyId: config.s3.credentials.accessKeyId,
        secretAccessKey: config.s3.credentials.secretAccessKey,
        endpoint: config.s3.endpoint,
      })
      return c.json({ fileLocation })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'downloadLastCircleK error')
      throw new HTTPException((err.code ?? 400) as 400 | 500, { message: err.message ?? 'Failed' })
    }
  })

  /**
   * GET /download/rabba — Download the latest Rabba file from S3
   */
  .get('/rabba', tokenIsValid, async (c) => {
    try {
      const fileLocation = await downloadLatestS3File({
        bucket: S3_BUCKET,
        prefix: bannerPrefix(BANNERS.RABBA.slug),
        path: 'temp/downloads/rabba',
        accessKeyId: config.s3.credentials.accessKeyId,
        secretAccessKey: config.s3.credentials.secretAccessKey,
        endpoint: config.s3.endpoint,
      })
      return c.json({ fileLocation })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'downloadLastRabba error')
      throw new HTTPException((err.code ?? 400) as 400 | 500, { message: err.message ?? 'Failed' })
    }
  })

  /**
   * GET /download/list — List all stored files from the database
   */
  .get('/list', tokenIsValid, async (c) => {
    try {
      const files = await db.select().from(uploadedFiles).orderBy(desc(uploadedFiles.storedAt))
      return c.json({ files })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'getLatestStoredFiles error')
      throw new HTTPException((err.code ?? 400) as 400 | 500, { message: err.message ?? 'Failed' })
    }
  })

  /**
   * GET /download/period-targets — Generate and return the period targets Excel file
   */
  .get('/period-targets', tokenIsValid, async (c) => {
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')
    if (!startDate || !endDate) {
      throw new HTTPException(400, { message: 'startDate and endDate query params are required (YYYY-MM-DD)' })
    }
    try {
      // STEP 1: Sync customers location + get data from DB
      await syncCustomersLocation()
      const weeklyTargets = await getWeeklyTargetsData(startDate, endDate)

      // STEP 2: Load template with JSZip (preserves slicers/pivots)
      const templatePath = path.join(process.cwd(), 'templates', PERIOD_TARGETS_TEMPLATE)
      const templateBuffer = await fs.readFile(templatePath)
      const zip = await JSZip.loadAsync(templateBuffer)

      // STEP 2.5: Pre-populate shared strings with Accumulated sheet strings
      const sharedStringsPath = 'xl/sharedStrings.xml'
      let sharedStringsXml = await zip.file(sharedStringsPath)!.async('string')

      const accumulatedStrings = [
        'Banner Re-order %',
        'Row Labels',
        '# of Stores Purchasing',
        'Total Stores',
        'Re-order %',
        '# of Weeks',
      ]
      for (let i = 0; i <= 100; i++) accumulatedStrings.push(`${i}%`)

      const existingCountMatch = sharedStringsXml.match(/uniqueCount="(\d+)"/)
      const existingCount = existingCountMatch ? parseInt(existingCountMatch[1] ?? '0') : 0

      const newStringElements = accumulatedStrings
        .map((str) => `<si><t>${str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></si>`)
        .join('')
      sharedStringsXml = sharedStringsXml.replace(/<\/sst>/, `${newStringElements}</sst>`)

      const newTotal = existingCount + accumulatedStrings.length
      sharedStringsXml = sharedStringsXml.replace(/count="\d+"/, `count="${newTotal}"`)
      sharedStringsXml = sharedStringsXml.replace(/uniqueCount="\d+"/, `uniqueCount="${newTotal}"`)
      zip.file(sharedStringsPath, sharedStringsXml)

      // STEP 3: Update Sell-In Database sheet
      await updateSellInDatabaseSheet(zip, weeklyTargets)

      // STEP 4: Add Accumulated sheet
      await createAccumulatedSheet(zip, weeklyTargets)

      // STEP 5: Fix pivot cache definitions
      await fixPivotCacheDefinitions(zip)

      // STEP 6: Return the file
      const finalBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })

      return new Response(finalBuffer as unknown as ArrayBuffer, {
        headers: {
          'Content-Disposition': 'attachment; filename="Sell-In Actuals vs Target Performance - UPDATED.xlsx"',
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'getPeriodTargetsFile error')
      throw new HTTPException((err.code ?? 400) as 400 | 500, { message: err.message ?? 'Failed' })
    }
  })

  /**
   * GET /download/:banner/:fileName — Download a specific banner file from S3
   */
  .get('/banners/:banner/:fileName', tokenIsValid, async (c) => {
    const { banner, fileName } = c.req.param()
    try {
      const supportedBanners = [BANNERS.CIRCLE_K.global, BANNERS.RABBA.global]
      const isBanner = supportedBanners.includes(banner)
      const prefix = isBanner
        ? bannerPrefix(banner === BANNERS.CIRCLE_K.global ? BANNERS.CIRCLE_K.slug : BANNERS.RABBA.slug)
        : config.s3.typePrefix(banner)

      const s3 = new AmazonS3Client({
        clientInfos: {
          region: S3_BUCKET.region,
          credentials: config.s3.credentials,
          endpoint: config.s3.endpoint,
        },
      })
      const s3Key = isBanner ? fileName : `${prefix}${fileName}`
      const content = await s3.getS3Content({ key: s3Key, bucket: S3_BUCKET.name })
      return c.body(content as unknown as ReadableStream)
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'downloadBannerReport error')
      throw new HTTPException((err.code ?? 400) as 400 | 500, { message: err.message ?? 'Failed' })
    }
  })

  /**
   * GET /download/:type/:fileName — Download a file from S3 by type (e.g. customers, sellin)
   */
  .get('/:type/:fileName', tokenIsValid, async (c) => {
    const { type, fileName } = c.req.param()
    try {
      const s3 = new AmazonS3Client({
        clientInfos: {
          region: S3_BUCKET.region,
          credentials: config.s3.credentials,
          endpoint: config.s3.endpoint,
        },
      })
      const s3Key = `${config.s3.typePrefix(type)}${fileName}`
      const content = await s3.getS3Content({ key: s3Key, bucket: S3_BUCKET.name })
      return c.body(content as unknown as ReadableStream)
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'downloadFile error')
      throw new HTTPException((err.code ?? 400) as 400 | 500, { message: err.message ?? 'Failed' })
    }
  })

// ─── Excel generation helpers ─────────────────────────────────────────────────

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

const REORDER_HEADERS = [HEADERS.rowLabel, HEADERS.storesPurchasing, HEADERS.totalStores, HEADERS.reorder]
const RATIO_HEADERS = [HEADERS.rowLabel, HEADERS.actuals, HEADERS.target, HEADERS.vsTarget]

type WeeklyTargetRow = Record<string, unknown>

async function getWeeklyTargetsData(startDate: string, endDate: string): Promise<WeeklyTargetRow[]> {
  const query = sql`WITH
  date_ranges AS (
    SELECT
      date_trunc('week', date)::date AS week_start,
      UPPER(TO_CHAR(date_trunc('month', date), 'Mon')) AS month,
      'W' || CEIL(EXTRACT(DAY FROM date_trunc('week', date)::date) / 7.0)::int AS week_num
    FROM
      available_dates
    WHERE
      date BETWEEN ${startDate}::date AND ${endDate}::date
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
      r.document_date::date BETWEEN ${startDate}::date AND ${endDate}::date
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
  "Week Start Day" ASC, id ASC`

  const result = await db.execute(query)
  const rows = result.rows as WeeklyTargetRow[]

  if (rows.length === 0) throw new Error('No data returned from query')
  if (rows.length > 100000) throw new Error(`Dataset too large: ${rows.length} rows. Maximum 100,000 rows allowed.`)

  return rows
}

function getColLetter(col: number): string {
  let letter = ''
  let num = col
  while (num >= 0) {
    letter = String.fromCharCode(65 + (num % 26)) + letter
    num = Math.floor(num / 26) - 1
  }
  return letter
}

function createTableXml(
  tableId: number,
  tableName: string,
  displayName: string,
  ref: string,
  headers: string[],
  styleId = 'TableStyleMedium5',
): string {
  const columns = headers
    .map(
      (header, idx) =>
        `<tableColumn id="${idx + 1}" name="${header.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"/>`,
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

async function updateSellInDatabaseSheet(zip: JSZip, weeklyTargets: WeeklyTargetRow[]) {
  const sheetPath = 'xl/worksheets/sheet5.xml'
  let sheetXml = await zip.file(sheetPath)!.async('string')

  const sheetDataMatch = sheetXml.match(/<sheetData[^>]*>([\s\S]*?)<\/sheetData>/)
  const existingSheetData = sheetDataMatch?.[1] ?? ''

  const row1 = existingSheetData.match(/<row r="1"[^>]*>[\s\S]*?<\/row>/)?.[0] ?? ''
  const row2 = existingSheetData.match(/<row r="2"[^>]*>[\s\S]*?<\/row>/)?.[0] ?? ''

  const sharedStringsPath = 'xl/sharedStrings.xml'
  const sharedStringsXml = await zip.file(sharedStringsPath)!.async('string')
  const stringManager = createStringManager(sharedStringsXml)

  const headerCells = Array.from(row2.matchAll(/<c r="([A-Z]+)2"[^>]*>[\s\S]*?<v>(\d+)<\/v>[\s\S]*?<\/c>/g))
  const templateHeaders: string[] = []
  const headerColLetters: string[] = []
  const headerStyleIndices: (string | null)[] = []

  const indexToString = new Map<number, string>()
  const siMatches = Array.from(sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g))
  for (let i = 0; i < siMatches.length; i++) {
    const tMatch = siMatches[i]?.[1]?.match(/<t[^>]*>([^<]*)<\/t>/)
    if (tMatch?.[1]) indexToString.set(i, tMatch[1])
  }

  for (const match of headerCells) {
    const colLetter = match[1] ?? ''
    const stringIndex = parseInt(match[2] ?? '0')
    const headerText = indexToString.get(stringIndex)
    if (headerText) {
      templateHeaders.push(headerText)
      headerColLetters.push(colLetter)
      headerStyleIndices.push(null)
    }
  }

  const row3Match = existingSheetData.match(/<row r="3"[^>]*>[\s\S]*?<\/row>/)
  if (row3Match) {
    const row3 = row3Match[0]
    for (let i = 0; i < headerColLetters.length; i++) {
      const colLetter = headerColLetters[i]
      const styleMatch = row3.match(new RegExp(`<c r="${colLetter}3"[^>]*s="(\\d+)"`))
      if (styleMatch) headerStyleIndices[i] = styleMatch[1] ?? null
    }
  }

  const queryKeys = Object.keys(weeklyTargets[0] ?? {})
  const headerMapping = templateHeaders.map((header) => queryKeys.find((key) => key === header) ?? null)

  const EXCEL_EPOCH = new Date(1899, 11, 30).getTime()
  const MS_PER_DAY = 86400000
  const dataRows: string[] = []

  for (let i = 0; i < weeklyTargets.length; i++) {
    const rowNum = i + 3
    const rowData = weeklyTargets[i]!
    const cells: string[] = []

    for (let j = 0; j < headerMapping.length; j++) {
      const headerKey = headerMapping[j]
      const value = headerKey ? rowData[headerKey] : null
      const cellRef = `${headerColLetters[j]}${rowNum}`
      const styleIndex = headerStyleIndices[j]

      if (value == null || value === '') {
        cells.push(`<c r="${cellRef}"/>`)
      } else if (value instanceof Date) {
        const excelDate = (value.getTime() - EXCEL_EPOCH) / MS_PER_DAY
        cells.push(`<c r="${cellRef}" s="${styleIndex || '1'}"><v>${excelDate}</v></c>`)
      } else if (typeof value === 'number') {
        cells.push(`<c r="${cellRef}"><v>${value}</v></c>`)
      } else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
        cells.push(`<c r="${cellRef}"><v>${parseFloat(value)}</v></c>`)
      } else {
        cells.push(`<c r="${cellRef}" t="s"><v>${stringManager.getStringIndex(String(value))}</v></c>`)
      }
    }

    dataRows.push(`<row r="${rowNum}">${cells.join('')}</row>`)
  }

  const newSheetData = `<sheetData>${row1}${row2}${dataRows.join('')}</sheetData>`
  sheetXml = sheetXml.replace(/<sheetData[^>]*>[\s\S]*?<\/sheetData>/, newSheetData)

  const lastRow = 2 + weeklyTargets.length
  const lastCol = headerColLetters[headerColLetters.length - 1] ?? 'A'
  sheetXml = sheetXml.replace(/<dimension[^>]*\/>/, `<dimension ref="A1:${lastCol}${lastRow}"/>`)
  sheetXml = sheetXml.replace(/<autoFilter[^>]*ref="[^"]*"([^>]*)\/>/, `<autoFilter ref="A2:${lastCol}${lastRow}"$1/>`)

  zip.file(sheetPath, sheetXml)
  if (stringManager.hasNewStrings()) zip.file(sharedStringsPath, stringManager.getUpdatedXml())
}

async function createAccumulatedSheet(zip: JSZip, weeklyTargets: WeeklyTargetRow[]) {
  const sharedStringsPath = 'xl/sharedStrings.xml'
  const sharedStringsXml = await zip.file(sharedStringsPath)!.async('string')
  const stringManager = createStringManager(sharedStringsXml)

  type TableRow = { row: number; cells: string[] }
  type TableResult = { rows: TableRow[]; endRow: number; endCol: number; tableRange: string; headerRow: number }

  const createTable = (
    title: string,
    headers: string[],
    data: Record<string, string | number>[],
    startRow: number,
    startCol: number,
    isRatioTable = false,
  ): TableResult => {
    const tableRows: TableRow[] = []
    let currentRow = startRow

    const titleCell = `${getColLetter(startCol)}${currentRow}`
    tableRows.push({
      row: currentRow,
      cells: [`<c r="${titleCell}" t="s" s="29"><v>${stringManager.getStringIndex(title)}</v></c>`],
    })
    currentRow++

    let weeksRowNum: number | null = null
    if (isRatioTable) {
      weeksRowNum = currentRow
      const weeksLabelCell = `${getColLetter(startCol)}${currentRow}`
      const value1Cell = `${getColLetter(startCol + 1)}${currentRow}`
      const value9Cell = `${getColLetter(startCol + 2)}${currentRow}`
      tableRows.push({
        row: currentRow,
        cells: [
          `<c r="${weeksLabelCell}" t="s" s="57"><v>${stringManager.getStringIndex('# of Weeks')}</v></c>`,
          `<c r="${value1Cell}" s="56"><v>1</v></c>`,
          `<c r="${value9Cell}" s="56"><v>9</v></c>`,
        ],
      })
    }
    currentRow++

    const headerRow = currentRow
    const headerCells = headers.map((header, i) => {
      const col = getColLetter(startCol + i)
      const styleIdx = isRatioTable ? (i === 0 ? '47' : '48') : '30'
      return `<c r="${col}${currentRow}" t="s" s="${styleIdx}"><v>${stringManager.getStringIndex(header)}</v></c>`
    })
    tableRows.push({ row: currentRow, cells: headerCells })
    currentRow++

    for (const rowData of data) {
      const cells: string[] = []
      headers.forEach((header, idx) => {
        const cellRef = `${getColLetter(startCol + idx)}${currentRow}`
        const value = rowData[header]

        if (value == null || value === '') {
          cells.push(`<c r="${cellRef}"/>`)
        } else if (idx === 3 && (header === HEADERS.vsTarget || header === HEADERS.reorder)) {
          if (!isRatioTable && header === HEADERS.reorder) {
            const spCell = `${getColLetter(startCol + 1)}${currentRow}`
            const tsCell = `${getColLetter(startCol + 2)}${currentRow}`
            const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) / 100 : Number(value) / 100
            cells.push(`<c r="${cellRef}" s="43"><f>IFERROR(${spCell}/${tsCell},0)</f><v>${numValue}</v></c>`)
          } else if (isRatioTable && header === HEADERS.vsTarget) {
            const actualsCell = `${getColLetter(startCol + 1)}${currentRow}`
            const targetCell = `${getColLetter(startCol + 2)}${currentRow}`
            const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) / 100 : Number(value) / 100
            cells.push(`<c r="${cellRef}" s="53"><f>IFERROR(${actualsCell}/${targetCell},0)</f><v>${numValue}</v></c>`)
          } else {
            const numValue = typeof value === 'string' ? parseFloat(value.replace('%', '')) / 100 : Number(value) / 100
            cells.push(`<c r="${cellRef}" s="${isRatioTable ? '53' : '43'}"><v>${numValue}</v></c>`)
          }
        } else if (typeof value === 'number') {
          if (isRatioTable && idx === 1 && header === HEADERS.actuals && weeksRowNum) {
            const weeksCell = `${getColLetter(startCol + 1)}${weeksRowNum}`
            cells.push(`<c r="${cellRef}" s="58"><f>ROUND(${value}/${weeksCell},1)</f><v>${value}</v></c>`)
          } else if (isRatioTable && idx === 2 && header === HEADERS.target && weeksRowNum) {
            const weeksCell = `${getColLetter(startCol + 2)}${weeksRowNum}`
            cells.push(`<c r="${cellRef}" s="58"><f>ROUND(${value}/${weeksCell},1)</f><v>${value}</v></c>`)
          } else {
            cells.push(`<c r="${cellRef}" s="32"><v>${value}</v></c>`)
          }
        } else {
          const style = idx === 0 ? (isRatioTable ? ' s="49"' : ' s="31"') : ''
          cells.push(`<c r="${cellRef}" t="s"${style}><v>${stringManager.getStringIndex(String(value))}</v></c>`)
        }
      })

      tableRows.push({ row: currentRow, cells })
      currentRow++
    }

    const tableRange = `${getColLetter(startCol)}${headerRow}:${getColLetter(startCol + headers.length - 1)}${currentRow - 1}`
    return { rows: tableRows, endRow: currentRow - 1, endCol: startCol + headers.length - 1, tableRange, headerRow }
  }

  const { reorder: bannerReorder, ratio: bannerRatio } = calculateMetricsByGroup(weeklyTargets, 'Banner')
  const { reorder: regionReorder, ratio: regionRatio } = calculateMetricsByGroup(weeklyTargets, 'Region')
  const { reorder: districtReorder, ratio: districtRatio } = calculateMetricsByGroup(weeklyTargets, 'District')
  const { reorder: territoryReorder, ratio: territoryRatio } = calculateMetricsByGroup(weeklyTargets, 'Territory')

  type TableDef = { title: string; headers: string[]; data: Record<string, string | number>[]; isRatio: boolean }
  const tables: TableDef[] = [
    { title: `Banner ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: bannerReorder, isRatio: false },
    { title: `Banner ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: bannerRatio, isRatio: true },
    { title: `Region ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: regionReorder, isRatio: false },
    { title: `Region ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: regionRatio, isRatio: true },
    { title: `District ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: districtReorder, isRatio: false },
    { title: `District ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: districtRatio, isRatio: true },
    { title: `Territory ${HEADERS.reorder}`, headers: REORDER_HEADERS, data: territoryReorder, isRatio: false },
    { title: `Territory ${HEADERS.sellinStoreWeek}`, headers: RATIO_HEADERS, data: territoryRatio, isRatio: true },
  ]

  const TABLE_SPACING = 2
  const COLUMN_SPACING = 1
  const TABLE_WIDTH = 4

  const allRows = new Map<number, string[]>()
  let maxRow = 0
  let maxCol = 0
  const excelTables: { range: string; headers: string[]; displayName: string; isRatio: boolean }[] = []

  tables.forEach((table, idx) => {
    const columnIndex = idx % 2
    const tableRow = Math.floor(idx / 2)
    const startCol = columnIndex * (TABLE_WIDTH + COLUMN_SPACING)

    let startRow = 1
    for (let i = 0; i < tableRow; i++) {
      const leftTable = tables[i * 2]
      const rightTable = tables[i * 2 + 1]
      const leftHeight = (leftTable?.data.length ?? 0) + 3
      const rightHeight = (rightTable?.data.length ?? 0) + 3
      startRow += Math.max(leftHeight, rightHeight) + TABLE_SPACING
    }

    const result = createTable(table.title, table.headers, table.data, startRow, startCol, table.isRatio)

    result.rows.forEach(({ row, cells }) => {
      const existing = allRows.get(row) ?? []
      existing.push(...cells)
      allRows.set(row, existing)
    })

    excelTables.push({
      range: result.tableRange,
      headers: table.headers,
      displayName: table.title.replace(/[^a-zA-Z0-9]/g, ''),
      isRatio: table.isRatio,
    })

    maxRow = Math.max(maxRow, result.endRow)
    maxCol = Math.max(maxCol, result.endCol)
  })

  const rowsXml = Array.from(allRows.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rowNum, cells]) => `<row r="${rowNum}">${cells.join('')}</row>`)

  const tableParts = excelTables.map((_, idx) => `    <tablePart r:id="rId${idx + 1}"/>`).join('\n')

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

  const workbookXml = await zip.file('xl/workbook.xml')!.async('string')
  const accumulatedMatch = workbookXml.match(/<sheet[^>]*name="Accumulated"[^>]*r:id="(rId\d+)"[^>]*\/>/)

  let sheetNum = 8
  const relsPath = 'xl/_rels/workbook.xml.rels'

  if (accumulatedMatch) {
    const rId = accumulatedMatch[1]!
    let relsXml = await zip.file(relsPath)!.async('string')
    const rIdPattern = new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*/>`, 'g')
    for (const rel of relsXml.match(rIdPattern) ?? []) {
      const worksheetMatch = rel.match(/worksheets\/sheet(\d+)\.xml/)
      if (worksheetMatch) {
        sheetNum = parseInt(worksheetMatch[1] ?? '8')
        break
      }
    }
    relsXml = relsXml.replace(rIdPattern, '')
    relsXml = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNum}.xml"/></Relationships>`,
    )
    zip.file(relsPath, relsXml)
  }

  zip.file(`xl/worksheets/sheet${sheetNum}.xml`, sheetXml)

  const sheetRelsPath = `xl/worksheets/_rels/sheet${sheetNum}.xml.rels`
  let sheetRelsXml = zip.file(sheetRelsPath)
    ? await zip.file(sheetRelsPath)!.async('string')
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n</Relationships>`

  let nextTableId = 1
  const tablesFolder = zip.folder('xl/tables')
  if (tablesFolder) {
    tablesFolder.forEach((relativePath) => {
      const match = relativePath.match(/^table(\d+)\.xml$/)
      if (match) nextTableId = Math.max(nextTableId, parseInt(match[1] ?? '0') + 1)
    })
  }

  excelTables.forEach((tableInfo, idx) => {
    const tableNum = nextTableId + idx
    const tableStyle = tableInfo.isRatio ? 'TableStyleMedium5' : 'TableStyleMedium7'
    zip.file(
      `xl/tables/table${tableNum}.xml`,
      createTableXml(
        tableNum,
        `Table${tableNum}`,
        tableInfo.displayName,
        tableInfo.range,
        tableInfo.headers,
        tableStyle,
      ),
    )
    sheetRelsXml = sheetRelsXml.replace(
      '</Relationships>',
      `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${tableNum}.xml"/>\n</Relationships>`,
    )
  })

  zip.file(sheetRelsPath, sheetRelsXml)

  let contentTypesXml = await zip.file('[Content_Types].xml')!.async('string')
  if (!contentTypesXml.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml')) {
    contentTypesXml = contentTypesXml.replace(
      '</Types>',
      `<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>\n</Types>`,
    )
  }
  excelTables.forEach((_, idx) => {
    const partName = `/xl/tables/table${nextTableId + idx}.xml`
    if (!contentTypesXml.includes(partName)) {
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        `<Override PartName="${partName}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>\n</Types>`,
      )
    }
  })
  zip.file('[Content_Types].xml', contentTypesXml)

  if (stringManager.hasNewStrings()) zip.file(sharedStringsPath, stringManager.getUpdatedXml())
}

async function fixPivotCacheDefinitions(zip: JSZip) {
  const now = new Date()
  const EXCEL_EPOCH = new Date(1899, 11, 30).getTime()
  const excelDate = (now.getTime() - EXCEL_EPOCH) / 86400000

  const pivotCacheFiles: string[] = []
  zip.folder('xl/pivotCache')?.forEach((relativePath) => {
    if (relativePath.startsWith('pivotCacheDefinition') && relativePath.endsWith('.xml')) {
      pivotCacheFiles.push(relativePath)
    }
  })

  for (const cacheFile of pivotCacheFiles) {
    let cacheXml = await zip.file(`xl/pivotCache/${cacheFile}`)!.async('string')
    cacheXml = cacheXml.replace(/refreshedDate="[^"]*"/, `refreshedDate="${excelDate}"`)
    if (!cacheXml.includes('saveData="0"')) {
      cacheXml = cacheXml.replace(/<pivotCacheDefinition([^>]*)>/, '<pivotCacheDefinition$1 saveData="0">')
    }
    cacheXml = cacheXml.replace(/recordCount="\d+"/, 'recordCount="0"')
    const recordsPath = cacheFile.replace('pivotCacheDefinition', 'pivotCacheRecords')
    if (zip.file(`xl/pivotCache/${recordsPath}`)) {
      zip.remove(`xl/pivotCache/${recordsPath}`)
      cacheXml = cacheXml.replace(/<pivotCacheRecords[^>]*\/>/, '')
    }
    zip.file(`xl/pivotCache/${cacheFile}`, cacheXml)
  }
}

type MetricRow = Record<string, string | number>

function calculateMetricsByGroup(
  data: WeeklyTargetRow[],
  groupKey: string,
): { reorder: MetricRow[]; ratio: MetricRow[] } {
  const grouped = groupBy(data, groupKey)
  const sorted = sortBy(Object.entries(grouped), ([label]) => label)

  return sorted.reduce<{ reorder: MetricRow[]; ratio: MetricRow[] }>(
    (acc, [label, groupData]) => {
      const storesWithOrders = new Set<unknown>()
      const totalStores = new Set<unknown>()
      const uniqueStoreTargets = new Map<unknown, number>()

      for (const row of groupData) {
        const storeId = row['S4H ID']
        totalStores.add(storeId)
        if (!uniqueStoreTargets.has(storeId)) uniqueStoreTargets.set(storeId, Number(row['Period Target'] ?? 0))
        if (Number(row['Weekly quantity'] ?? 0) > 0) storesWithOrders.add(storeId)
      }

      const ordered = storesWithOrders.size
      const total = totalStores.size
      const totalTarget = Array.from(uniqueStoreTargets.values()).reduce((sum, t) => sum + t, 0)
      const totalActuals = sumBy(groupData, (r) => Number(r['Weekly quantity'] ?? 0))

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
