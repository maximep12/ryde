import { createBaseLogger } from '@repo/logger'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ContextVariables } from '../../index'
import { receiveFileUpload } from '../../lib/fileUpload'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import {
  canUpload7Eleven,
  canUploadBgFuels,
  canUploadCentralMarket,
  canUploadCircleK,
  canUploadLoblaws,
  canUploadNapOrange,
  canUploadParkland,
  canUploadPetroCanada,
  canUploadRabba,
  canUploadSobeys,
  requireRoles,
} from '../../middlewares/auth'
import { UPLOAD_RESULT_STATES } from '../../utils/constants.js'
import {
  getAllReports,
  getDistinctReportTypes,
  getReportById,
  getReportsByType,
  linkReportToDataImport,
  process7ElevenFile,
  processBgFuelsFile,
  processCentralMarketFile,
  processCircleKFile,
  processCircleKQcAtlFile,
  processLoblawsFile,
  processNapOrangeFile,
  processParklandFile,
  processPetroCanadaFile,
  processRabbaFile,
  processSobeysFile,
  REPORT_TYPE_BG_FUELS,
  REPORT_TYPE_CENTRAL_MARKET,
  REPORT_TYPE_CIRCLE_K,
  REPORT_TYPE_CIRCLE_K_QCATL,
  REPORT_TYPE_LOBLAWS,
  REPORT_TYPE_NAP_ORANGE,
  REPORT_TYPE_PARKLAND,
  REPORT_TYPE_PETRO_CANADA,
  REPORT_TYPE_RABBA,
  REPORT_TYPE_SEVEN_ELEVEN,
  REPORT_TYPE_SOBEYS,
  updateReportFailure,
  updateReportSuccess,
} from './helpers'

const logger = createBaseLogger().child({ module: 'banners' })

const tokenIsValid = requireRoles('admin', 'data_manager')

const bannersRouter = new Hono<{ Variables: ContextVariables }>()

export const bannersRouterDefinition = bannersRouter

  /**
   * GET /banners/reports/all — List all import reports (paginated)
   */
  .get('/reports/all', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 20)))

    const types = c.req.query('types')
    const dateFrom = c.req.query('dateFrom')
    const dateTo = c.req.query('dateTo')
    const status = c.req.query('status') as 'success' | 'failed' | undefined
    const uploadedBy = c.req.query('uploadedBy')

    const filters = {
      types: types ? types.split(',') : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: status === 'success' || status === 'failed' ? status : undefined,
      uploadedBy: uploadedBy || undefined,
    }

    const { rows, total } = await getAllReports(page, pageSize, filters)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * GET /banners/reports/types — List all distinct report types
   */
  .get('/reports/types', tokenIsValid, async (c) => {
    const types = await getDistinctReportTypes()
    return c.json({ types })
  })

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

      logger.info(
        { ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated },
        'Circle K QC+ATL import success',
      )
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

  /**
   * POST /banners/centralMarket — Import Central Market sell-out Excel
   */
  .post('/centralMarket', canUploadCentralMarket, async (c) => {
    logger.info('Central Market import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_CENTRAL_MARKET,
      type: 'sell-out',
      banner: 'central-market',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processCentralMarketFile(buffer)

      logger.info(
        { ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated },
        'Central Market import success',
      )
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.centralMarket })
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
          unit: 'Central Market orders',
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
      logger.error({ err }, 'Central Market import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.centralMarket,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/centralMarket', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_CENTRAL_MARKET, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * POST /banners/napOrange — Import NAP Orange sell-out Excel
   */
  .post('/napOrange', canUploadNapOrange, async (c) => {
    logger.info('NAP Orange import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_NAP_ORANGE,
      type: 'sell-out',
      banner: 'nap-orange',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processNapOrangeFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'NAP Orange import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.napOrange })
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
          unit: 'NAP Orange orders',
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
      logger.error({ err }, 'NAP Orange import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.napOrange,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/napOrange', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_NAP_ORANGE, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * POST /banners/sobeys — Import Sobeys sell-out Excel
   */
  .post('/sobeys', canUploadSobeys, async (c) => {
    logger.info('Sobeys import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_SOBEYS,
      type: 'sell-out',
      banner: 'sobeys',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processSobeysFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'Sobeys import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sobeys })
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
          unit: 'Sobeys orders',
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
      logger.error({ err }, 'Sobeys import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.sobeys,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/sobeys', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_SOBEYS, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * POST /banners/loblaws — Import Loblaws sell-out CSV
   */
  .post('/loblaws', canUploadLoblaws, async (c) => {
    logger.info('Loblaws import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_LOBLAWS,
      type: 'sell-out',
      banner: 'loblaws',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processLoblawsFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'Loblaws import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.loblaws })
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
          unit: 'Loblaws orders',
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
      logger.error({ err }, 'Loblaws import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.loblaws,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/loblaws', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_LOBLAWS, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * POST /banners/parkland — Import Parkland sell-out Excel
   */
  .post('/parkland', canUploadParkland, async (c) => {
    logger.info('Parkland import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_PARKLAND,
      type: 'sell-out',
      banner: 'parkland',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processParklandFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'Parkland import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.parkland })
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
          unit: 'Parkland orders',
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
      logger.error({ err }, 'Parkland import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.parkland,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/parkland', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_PARKLAND, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * POST /banners/petrocanada — Import Petro Canada sell-out Excel
   */
  .post('/petrocanada', canUploadPetroCanada, async (c) => {
    logger.info('Petro Canada import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_PETRO_CANADA,
      type: 'sell-out',
      banner: 'petro-canada',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processPetroCanadaFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'Petro Canada import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.petroCanada })
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
          unit: 'Petro Canada orders',
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
      logger.error({ err }, 'Petro Canada import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.petroCanada,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/petrocanada', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_PETRO_CANADA, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * POST /banners/7eleven — Import 7-Eleven sell-out Excel
   */
  .post('/7eleven', canUpload7Eleven, async (c) => {
    logger.info('7-Eleven import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_SEVEN_ELEVEN,
      type: 'sell-out',
      banner: '7-eleven',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await process7ElevenFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, '7-Eleven import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sevenEleven })
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
          unit: '7-Eleven orders',
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
      logger.error({ err }, '7-Eleven import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.sevenEleven,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/7eleven', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_SEVEN_ELEVEN, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * POST /banners/bgFuels — Import BG Fuels sell-out pipe-delimited file
   */
  .post('/bgFuels', canUploadBgFuels, async (c) => {
    logger.info('BG Fuels import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_BG_FUELS,
      type: 'sell-out',
      banner: 'bg-fuels',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processBgFuelsFile(buffer)

      logger.info({ ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated }, 'BG Fuels import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.bgFuels })
      await updateReportSuccess(report.id, {
        created: res.createdRows,
        updated: res.updatedRows,
        deleted: res.deletedRows,
        rejected: res.rejected,
        identical: res.identicalRows,
      })
      if (res.dataImportId) await linkReportToDataImport(report.id, res.dataImportId)

      return c.json({
        result: {
          created: res.ordersCreated,
          updated: res.ordersUpdated,
          unit: 'BG Fuels orders',
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
      logger.error({ err }, 'BG Fuels import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.bgFuels,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      throw new HTTPException((err.code ?? 400) as 400 | 406 | 500, { message: err.message ?? 'Upload failed' })
    }
  })

  .get('/reports/bgFuels', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_BG_FUELS, page, pageSize)
    return c.json({ reports: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } })
  })

  /**
   * GET /banners/reports/:id — Get a single report by ID
   * Registered after all named /reports/<banner> routes to avoid param capture conflicts.
   */
  .get('/reports/:id', tokenIsValid, async (c) => {
    const id = Number(c.req.param('id'))
    if (Number.isNaN(id)) return c.json({ error: 'Invalid report ID' }, 400)
    const report = await getReportById(id)
    if (!report) return c.json({ error: 'Report not found' }, 404)
    return c.json({ report })
  })
