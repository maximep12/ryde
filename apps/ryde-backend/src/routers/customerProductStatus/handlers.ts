import { createBaseLogger } from '@repo/logger'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ContextVariables } from '../../index'
import { readExcelFile } from '../../lib/FileParser/excel'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import { requireRoles } from '../../middlewares/auth'
import { ERRORS, UPLOAD_RESULT_STATES } from '../../utils/constants'
import {
  createReport,
  createStatus,
  getCustomerIds,
  getExistingStatuses,
  getReportsByType,
  updateReportFailure,
  updateReportSuccess,
  updateStatus,
} from './helpers'

const REPORT_TYPE = 'CUSTOMER_PRODUCT_STATUS'

const logger = createBaseLogger().child({ module: 'customer-product-status' })

const tokenIsValid = requireRoles('admin', 'data_manager')

const customerProductStatusRouter = new Hono<{ Variables: ContextVariables }>()

export const customerProductStatusRouterDefinition = customerProductStatusRouter

  /**
   * POST /customerProductStatus — Import customer product statuses from Excel
   */
  .post('/', tokenIsValid, async (c) => {
    logger.info('Customer product status import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const report = await createReport(REPORT_TYPE, fileName)

    try {
      const stream = c.req.raw.body
      if (!stream) throw new HTTPException(400, { message: 'Missing file body' })

      const contentBySheet = await readExcelFile({
        stream: stream as unknown as NodeJS.ReadableStream,
        expected: [{ sheetName: 'Data', columns: ['ID', 'Date', 'Placements', 'Facings'] }],
      })

      const sheetData = contentBySheet.find((s) => s.sheetName === 'Data')
      if (!sheetData) throw new HTTPException(400, { message: 'Missing Data sheet' })

      const { values } = sheetData

      const customerIdSet = new Set(await getCustomerIds())

      const excluded: string[] = []

      type ParsedStatus = {
        customerId: number
        statusDate: string
        facings: number
        placements: number
      }

      const parsed: ParsedStatus[] = []

      for (const it of values) {
        const { rowNumber, id, date, facings, placements } = it as Record<string, unknown>
        const rowNum = String(rowNumber ?? '?')

        const customerId = Number(id)
        if (!customerIdSet.has(customerId)) {
          excluded.push(ERRORS.invalidERP(rowNum, id))
          continue
        }

        if (facings !== null && facings !== undefined && isNaN(Number(facings))) {
          excluded.push(ERRORS.custom(rowNum, `Facings must be a number. Received ${facings}`))
          continue
        }

        if (placements !== null && placements !== undefined && isNaN(Number(placements))) {
          excluded.push(ERRORS.custom(rowNum, `Placements must be a number. Received ${placements}`))
          continue
        }

        const dateRaw = String(date ?? '')
        const statusDate = dateRaw.includes('T') ? (dateRaw.split('T')[0] ?? dateRaw) : dateRaw

        parsed.push({
          customerId,
          statusDate,
          facings: Number(facings ?? 0),
          placements: Number(placements ?? 0),
        })
      }

      const existingStatuses = await getExistingStatuses()
      const existingMap = new Map(
        existingStatuses.map((s) => [`${s.customerId}|${s.statusDate}`, s]),
      )

      let createdRows = 0
      let updatedRows = 0
      let identicalRows = 0

      for (const { customerId, statusDate, facings, placements } of parsed) {
        const existing = existingMap.get(`${customerId}|${statusDate}`)

        if (existing) {
          if (existing.facings === facings && existing.placements === placements) {
            identicalRows++
          } else {
            await updateStatus({ customerId, statusDate, facings, placements })
            updatedRows++
          }
        } else {
          await createStatus({ customerId, statusDate, facings, placements })
          createdRows++
        }
      }

      logger.info({ createdRows, updatedRows }, 'Customer product status import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.customerProductStatus })
      await updateReportSuccess(report.id, {
        created: createdRows,
        updated: updatedRows,
        rejected: excluded,
        identical: identicalRows,
      })

      return c.json({
        result: {
          created: createdRows,
          updated: updatedRows,
          unit: 'Customer Product Statuses',
          status: excluded.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: values.length,
          rejected: excluded.length,
          created: createdRows,
          updated: updatedRows,
          deleted: 0,
          identical: identicalRows,
        },
        warnings: excluded,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Customer product status import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.customerProductStatus,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /customerProductStatus/reports — List import reports
   */
  .get('/reports', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

