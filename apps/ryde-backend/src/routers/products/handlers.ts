/**
 * @deprecated These handlers are deprecated and will be removed in a future version.
 * Do not add new routes or logic here.
 */
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createBaseLogger } from '@repo/logger'
import { ContextVariables } from '../../index'
import { parseCsvStream } from '../../lib/FileParser/csv'
import { requireRoles } from '../../middlewares/auth'
import { ERRORS, UPLOAD_RESULT_STATES } from '../../utils/constants.js'
import {
  bulkUpsertProductFormats,
  bulkUpsertProducts,
  createReport,
  getReportsByType,
  updateReportFailure,
  updateReportSuccess,
} from './helpers'

const productsLogger = createBaseLogger().child({ module: 'products' })
const formatsLogger = createBaseLogger().child({ module: 'product-formats' })

const tokenIsValid = requireRoles('Admin')

const productsRouter = new Hono<{ Variables: ContextVariables }>()

export const productsRouterDefinition = productsRouter

  /**
   * POST /products — Create products from CSV
   * Expected CSV columns: source_id, maktx, maktg, ean11
   */
  .post('/', tokenIsValid, async (c) => {
    console.warn('[DEPRECATED] POST /products is deprecated and will be removed in a future version.')
    productsLogger.info('Products import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '')
    const report = await createReport('PRODUCTS', fileName)

    try {
      const stream = c.req.raw.body
      if (!stream) throw new HTTPException(400, { message: 'Missing file body' })

      const rows = await parseCsvStream(stream as unknown as NodeJS.ReadableStream)

      const rejectedRows: string[] = []
      type ParsedRow = {
        sku: string
        name: string
        description: string
        upc: string | null
        isWsc: boolean
      }
      const validRows: ParsedRow[] = []

      for (const row of rows) {
        const {
          source_id: sku,
          maktx: name,
          maktg: description,
          ean11: upc,
          rowNumber,
        } = row as Record<string, string | number | null>

        if (!sku) {
          rejectedRows.push(ERRORS.missingValue(rowNumber, 'source_id (SKU)'))
          continue
        }
        if (!name) {
          rejectedRows.push(ERRORS.missingValue(rowNumber, 'maktx (name)'))
          continue
        }
        if (!description) {
          rejectedRows.push(ERRORS.missingValue(rowNumber, 'maktg (description)'))
          continue
        }

        validRows.push({
          sku: String(sku),
          name: String(name),
          description: String(description),
          upc: upc ? String(upc) : null,
          isWsc: true,
        })
      }

      const { created, updated, identical } = await bulkUpsertProducts(validRows)

      productsLogger.info({ created, updated, identical }, 'Products import success')
      await updateReportSuccess(report.id, { created, updated, rejected: rejectedRows })

      return c.json({
        result: {
          created,
          rejected: rejectedRows,
          unit: 'products',
          status: rejectedRows.length > 0 ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: rows.length,
          rejected: rejectedRows.length,
          created,
          updated,
          deleted: 0,
          identical,
        },
        warnings: rejectedRows,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      productsLogger.error({ err }, 'Products import error')
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * POST /products/formats — Create product formats from CSV
   * Expected CSV columns: sourceId, umrez, umren, ean11, meinh
   */
  .post('/formats', tokenIsValid, async (c) => {
    console.warn('[DEPRECATED] POST /products/formats is deprecated and will be removed in a future version.')
    formatsLogger.info('Product formats import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '')
    const report = await createReport('PRODUCT_FORMATS', fileName)

    try {
      const stream = c.req.raw.body
      if (!stream) throw new HTTPException(400, { message: 'Missing file body' })

      const rows = await parseCsvStream(stream as unknown as NodeJS.ReadableStream)

      const rejectedRows: string[] = []
      type ParsedRow = {
        sku: string
        numerator: number | null
        denominator: number | null
        unit: string | null
        upc: string | null
      }
      const validRows: ParsedRow[] = []

      for (const row of rows) {
        const {
          sourceId: sku,
          umrez: numerator,
          umren: denominator,
          ean11: upc,
          meinh: unitOfMeasure,
        } = row as Record<string, string | number | null>

        if (!sku) {
          rejectedRows.push(`Row: Missing sourceId (SKU)`)
          continue
        }

        let unit = unitOfMeasure ? String(unitOfMeasure) : null
        if (unit === 'KAR') unit = 'CAR'

        validRows.push({
          sku: String(sku),
          numerator: numerator !== null ? Number(numerator) : null,
          denominator: denominator !== null ? Number(denominator) : null,
          unit,
          upc: upc ? String(upc) : null,
        })
      }

      const insertedFormats = await bulkUpsertProductFormats(validRows)
      const created = insertedFormats.length
      const identical = validRows.length - created

      formatsLogger.info({ created, identical }, 'Product formats import success')
      await updateReportSuccess(report.id, { created, updated: 0, rejected: rejectedRows })

      return c.json({
        result: {
          created,
          rejected: rejectedRows,
          unit: 'product formats',
          status: rejectedRows.length > 0 ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: rows.length,
          rejected: rejectedRows.length,
          created,
          updated: 0,
          deleted: 0,
          identical,
        },
        warnings: rejectedRows,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      formatsLogger.error({ err }, 'Product formats import error')
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /products/reports — List import reports for products
   */
  .get('/reports', tokenIsValid, async (c) => {
    console.warn('[DEPRECATED] GET /products/reports is deprecated and will be removed in a future version.')
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType('PRODUCTS', page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * GET /products/formats/reports — List import reports for product formats
   */
  .get('/formats/reports', tokenIsValid, async (c) => {
    console.warn('[DEPRECATED] GET /products/formats/reports is deprecated and will be removed in a future version.')
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType('PRODUCT_FORMATS', page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })
