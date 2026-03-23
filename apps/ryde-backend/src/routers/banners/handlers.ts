import { createBaseLogger } from '@repo/logger'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ContextVariables } from '../../index'
import { receiveFileUpload } from '../../lib/fileUpload'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import { canUploadCircleK, canUploadRabba, requireRoles } from '../../middlewares/auth'
import { UPLOAD_RESULT_STATES } from '../../utils/constants.js'
import {
  getReportsByType,
  linkReportToDataImport,
  processCircleKFile,
  processCircleKQcAtlFile,
  processRabbaFile,
  REPORT_TYPE_CIRCLE_K,
  REPORT_TYPE_CIRCLE_K_QCATL,
  REPORT_TYPE_RABBA,
  updateReportFailure,
  updateReportSuccess,
} from './helpers'

const logger = createBaseLogger().child({ module: 'banners' })

const tokenIsValid = requireRoles('admin', 'data_manager')

const bannersRouter = new Hono<{ Variables: ContextVariables }>()

export const bannersRouterDefinition = bannersRouter

  /**
   * POST /banners/rabba — Import Rabba weekly sell-out CSV
   */
  .post('/rabba', canUploadRabba, async (c) => {
    logger.info('Rabba import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_RABBA,
      type: 'sell-out',
      banner: 'rabba',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processRabbaFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'Rabba import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.rabba })
      await updateReportSuccess(report.id, {
        created: res.createdRows,
        updated: res.updatedRows,
        deleted: res.deletedRows,
        rejected: res.rejected,
        identical: res.identicalRows,
      })
      await linkReportToDataImport(report.id, res.dataImportId)

      return c.json({
        result: {
          created: res.ordersCreated,
          updated: res.ordersUpdated,
          unit: 'Rabba orders',
          status: res.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: res.received,
          rejected: res.rejected.length,
          created: res.createdRows,
          updated: res.updatedRows,
          deleted: res.deletedRows,
          identical: res.identicalRows,
        },
        warnings: res.rejected,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Rabba import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.rabba,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /banners/reports/rabba — List import reports for Rabba
   */
  .get('/reports/rabba', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_RABBA, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * POST /banners/circleK — Import Circle K weekly sell-out Excel
   */
  .post('/circleK', canUploadCircleK, async (c) => {
    logger.info('Circle K import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_CIRCLE_K,
      type: 'sell-out',
      banner: 'circle-k',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processCircleKFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'Circle K import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.circleK })
      await updateReportSuccess(report.id, {
        created: res.createdRows,
        updated: res.updatedRows,
        deleted: res.deletedRows,
        rejected: res.rejected,
        identical: res.identicalRows,
      })
      await linkReportToDataImport(report.id, res.dataImportId)

      return c.json({
        result: {
          created: res.ordersCreated,
          updated: res.ordersUpdated,
          unit: 'Circle K orders',
          status: res.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: res.received,
          rejected: res.rejected.length,
          created: res.createdRows,
          updated: res.updatedRows,
          deleted: res.deletedRows,
          identical: res.identicalRows,
        },
        warnings: res.rejected,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Circle K import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.circleK,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * POST /banners/circleK/qcatl — Import Circle K QC+ATL weekly sell-out Excel
   */
  .post('/circleK/qcatl', canUploadCircleK, async (c) => {
    logger.info('Circle K QC+ATL import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_CIRCLE_K_QCATL,
      type: 'sell-out',
      banner: 'circle-k-qcatl',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processCircleKQcAtlFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'Circle K QC+ATL import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.circleK })
      await updateReportSuccess(report.id, {
        created: res.createdRows,
        updated: res.updatedRows,
        deleted: res.deletedRows,
        rejected: res.rejected,
        identical: res.identicalRows,
      })
      await linkReportToDataImport(report.id, res.dataImportId)

      return c.json({
        result: {
          created: res.ordersCreated,
          updated: res.ordersUpdated,
          unit: 'Circle K QC+ATL orders',
          status: res.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: res.received,
          rejected: res.rejected.length,
          created: res.createdRows,
          updated: res.updatedRows,
          deleted: res.deletedRows,
          identical: res.identicalRows,
        },
        warnings: res.rejected,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Circle K QC+ATL import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.circleK,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /banners/reports/circleK — List import reports for Circle K global
   */
  .get('/reports/circleK', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_CIRCLE_K, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * GET /banners/reports/circleK/qcatl — List import reports for Circle K QC+ATL
   */
  .get('/reports/circleK/qcatl', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_CIRCLE_K_QCATL, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })
