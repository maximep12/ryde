/**
 * @deprecated These handlers are deprecated and will be removed in a future version.
 * Do not add new routes or logic here.
 */
import { replenOrdersConfirmed } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../../db'
import { ContextVariables } from '../../index'
import { readExcelFile } from '../../lib/FileParser/excel'
import { parseSevenElevenWHToStore } from '../../lib/FileParser/sevenElevenExcel'
import { bufferToStream, receiveFileUpload } from '../../lib/fileUpload'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import { requireRoles } from '../../middlewares/auth'
import { ERRORS, UPLOAD_RESULT_STATES } from '../../utils/constants.js'
import {
  getAllCustomerIds,
  getCustomersByBanner,
  getExistingConfirmedOrders,
  getExistingConfirmedOrdersByCustomersAndDate,
  getProductSkusWithFormats,
  getReportsByType,
  getSevenElevenUpcProducts,
  processCircleKQcConfirmedFile,
  updateReportFailure,
  updateReportSuccess,
} from './helpers'

const REPORT_TYPE_CONFIRMED = 'CONFIRMED_ORDERS'
const REPORT_TYPE_SEVEN_ELEVEN_CONFIRMED = '7_ELEVEN_CONFIRMED'
const REPORT_TYPE_CIRCLE_K_CONFIRMED = 'CIRCLE_K_CONFIRMED'
const BANNER_SEVEN_ELEVEN = '7-Eleven'

const logger = createBaseLogger().child({ module: 'sellin-orders-confirmed' })

const tokenIsValid = requireRoles('admin', 'data_manager')

const SEVEN_ELEVEN_SKUS_TO_USE = ['100054', '100051', '100101']

const sellinOrdersConfirmedRouter = new Hono<{ Variables: ContextVariables }>()

export const sellinOrdersConfirmedRouterDefinition = sellinOrdersConfirmedRouter

  /**
   * POST /sellin-orders-confirmed/file — Import confirmed sell-in orders from Excel
   */
  .post('/file', tokenIsValid, async (c) => {
    logger.info('Confirmed sell-in import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_CONFIRMED,
      type: 'confirmed',
      uploadedBy: c.get('user').id,
    })

    try {
      const contentBySheet = await readExcelFile({
        stream: bufferToStream(buffer),
        expected: [
          {
            sheetName: 'Data',
            columns: [
              'Document Date',
              'Sold-to Party',
              'Sales Document',
              'Sales Document Type',
              'Material',
              'Sales Unit',
              'Delivery Date',
              'Net Value (Item)',
              'Overall Status Description',
              'Reason for Rejection',
              'Confirmed Quantity (Schedule Line)',
            ],
          },
        ],
      })

      const sheetData = contentBySheet.find((s) => s.sheetName === 'Data')
      if (!sheetData) throw new HTTPException(400, { message: 'Missing Data sheet' })

      const { values } = sheetData

      const salesDocumentsInFile = [
        ...new Set((values as Record<string, unknown>[]).map((v) => String(v.salesDocument)).filter(Boolean)),
      ]

      const [[customerIds, availableSkus], existingConfirmed] = await Promise.all([
        Promise.all([getAllCustomerIds(), getProductSkusWithFormats()]),
        getExistingConfirmedOrders(salesDocumentsInFile),
      ])

      let ordersCreated = 0
      let ordersUpdated = 0
      let createdRows = 0
      let updatedRows = 0
      let identicalRows = 0
      const rejectedRows: string[] = []

      type CreateRow = {
        documentDate: string
        salesDocument: string
        customerId: number
        sku: string
        salesUnit: string
        deliveryDate: string
        status: string
        rejectionReason: string
        confirmedQuantity: number
        netValue: string
      }
      type UpdateRow = { id: number; newQuantity: number; newNetValue: string }

      const seenInFile = new Set<string>()

      const { create, update } = values.reduce<{ create: CreateRow[]; update: UpdateRow[] }>(
        (acc, it) => {
          const {
            rowNumber,
            documentDate,
            soldToParty,
            salesDocument,
            salesDocumentType,
            material,
            salesUnit,
            deliveryDate,
            overallStatusDescription,
            reasonForRejection,
            confirmedQuantityScheduleLine,
            netValueItem,
          } = it as Record<string, unknown>

          if (salesDocumentType !== 'OR') {
            rejectedRows.push(ERRORS.custom(rowNumber, `SalesDocumentType is not "OR" - ${salesDocumentType} `))
            return acc
          }

          if (Number(confirmedQuantityScheduleLine) === 0) {
            rejectedRows.push(ERRORS.custom(rowNumber, `ConfirmedQuantityScheduleLine equals 0`))
            return acc
          }

          const customerIdNum = Number(soldToParty)
          if (!customerIds.includes(customerIdNum)) {
            rejectedRows.push(ERRORS.invalidERP(rowNumber, soldToParty))
            return acc
          }

          const linkedSku = availableSkus.find((s) => s.sku === String(material))
          if (!linkedSku) {
            rejectedRows.push(ERRORS.invalidSKU(rowNumber, material))
            return acc
          }

          if (!linkedSku.format) {
            rejectedRows.push(ERRORS.custom(rowNumber, `More than 1 format linked to this sku.`))
            return acc
          }

          const bottleQuantity = (linkedSku.format.numerator ?? 0) * Number(confirmedQuantityScheduleLine)

          if (!bottleQuantity) {
            rejectedRows.push(ERRORS.invalidFormat(rowNumber, { sku: material, unit: salesUnit }))
            return acc
          }

          if (reasonForRejection !== '') {
            rejectedRows.push(ERRORS.custom(rowNumber, `Reason for rejection is not empty - '${reasonForRejection}'`))
            return acc
          }

          if (overallStatusDescription !== 'Completed') {
            rejectedRows.push(
              ERRORS.custom(rowNumber, `OverallStatusDescription is not Completed - '${overallStatusDescription}'`),
            )
            return acc
          }

          const fileKey = `${String(salesDocument)}|${customerIdNum}|${String(material)}`
          if (seenInFile.has(fileKey)) {
            rejectedRows.push(
              ERRORS.custom(
                rowNumber,
                `Duplicate row in file: salesDocument "${String(salesDocument)}", customer "${customerIdNum}", SKU "${String(material)}" already processed`,
              ),
            )
            return acc
          }
          seenInFile.add(fileKey)

          const rowAlreadyExists = existingConfirmed.find(
            (e) =>
              String(e.salesDocument) === String(salesDocument) &&
              e.customerId === customerIdNum &&
              e.sku === String(material),
          )

          if (rowAlreadyExists) {
            const convertedValue = (Math.round(Number(netValueItem) * 100) / 100).toFixed(2)
            if (
              rowAlreadyExists.confirmedQuantity !== bottleQuantity ||
              String(rowAlreadyExists.netValue) !== convertedValue
            ) {
              return {
                ...acc,
                update: [
                  ...acc.update,
                  { id: rowAlreadyExists.id, newQuantity: bottleQuantity, newNetValue: convertedValue },
                ],
              }
            }
            identicalRows++
            return acc
          }

          const documentDateRaw = String(documentDate)
          const documentDateStr = documentDateRaw.includes('T')
            ? (documentDateRaw.split('T')[0] ?? documentDateRaw)
            : documentDateRaw
          const deliveryDateRaw = String(deliveryDate)
          const deliveryDateStr = deliveryDateRaw.includes('T')
            ? (deliveryDateRaw.split('T')[0] ?? deliveryDateRaw)
            : deliveryDateRaw

          return {
            ...acc,
            create: [
              ...acc.create,
              {
                documentDate: documentDateStr,
                salesDocument: String(salesDocument),
                customerId: customerIdNum,
                sku: String(material),
                salesUnit: String(salesUnit),
                deliveryDate: deliveryDateStr,
                status: String(overallStatusDescription),
                rejectionReason: String(reasonForRejection),
                confirmedQuantity: bottleQuantity,
                netValue: String(netValueItem),
              },
            ],
          }
        },
        { create: [], update: [] },
      )

      const CHUNK_SIZE = 500
      await db.transaction(async (tx) => {
        if (create.length) {
          for (let i = 0; i < create.length; i += CHUNK_SIZE) {
            const batch = create.slice(i, i + CHUNK_SIZE)
            const newRows = await tx.insert(replenOrdersConfirmed).values(batch).returning()
            ordersCreated += newRows.length
            createdRows += newRows.length
          }
        }

        for (const row of update) {
          await tx
            .update(replenOrdersConfirmed)
            .set({ confirmedQuantity: row.newQuantity, netValue: row.newNetValue })
            .where(eq(replenOrdersConfirmed.id, row.id))
          ordersUpdated++
          updatedRows++
        }
      })

      logger.info({ ordersCreated, ordersUpdated }, 'Confirmed sell-in import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.confirmed })
      await updateReportSuccess(report.id, {
        created: createdRows,
        updated: updatedRows,
        rejected: rejectedRows,
        identical: identicalRows,
      })

      return c.json({
        result: {
          created: ordersCreated,
          updated: ordersUpdated,
          unit: 'orders',
          status: rejectedRows.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: values.length,
          rejected: rejectedRows.length,
          created: createdRows,
          updated: updatedRows,
          deleted: 0,
          identical: identicalRows,
        },
        warnings: rejectedRows,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Confirmed sell-in import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.confirmed,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * POST /sellin-orders-confirmed/file/7-eleven — Import 7-Eleven confirmed sell-in orders
   */
  .post('/file/7-eleven', tokenIsValid, async (c) => {
    logger.info('7-Eleven confirmed import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_SEVEN_ELEVEN_CONFIRMED,
      type: '7-eleven-confirmed',
      uploadedBy: c.get('user').id,
    })

    try {
      const { dateRange, salesByCustomer, totalRowsReceived } = await parseSevenElevenWHToStore({
        stream: bufferToStream(buffer),
      })

      const [sevenElevenCustomers, upcProducts] = await Promise.all([
        getCustomersByBanner(BANNER_SEVEN_ELEVEN),
        getSevenElevenUpcProducts(BANNER_SEVEN_ELEVEN, SEVEN_ELEVEN_SKUS_TO_USE),
      ])

      const customerIds = sevenElevenCustomers.map((c) => c.id)
      const periodStart = dateRange.start

      const existingConfirmed = await getExistingConfirmedOrdersByCustomersAndDate(customerIds, periodStart)

      const customersByBannerInternalId = new Map(sevenElevenCustomers.map((c) => [c.bannerInternalId, c]))
      const existingConfirmedMap = new Map(
        existingConfirmed.map((e) => [`${String(e.salesDocument)}|${e.customerId}|${e.sku}`, e]),
      )

      let identicalRows = 0
      const rejectedRows: string[] = []

      const toInsert: {
        sku: string
        confirmedQuantity: number
        netValue: string
        salesDocument: string
        documentDate: string
        status: string
        salesUnit: string | undefined
        customerId: number
        deliveryDate: string
      }[] = []
      const toUpdate: { id: number; confirmedQuantity: number; netValue: string }[] = []

      for (const { customerId, products } of salesByCustomer) {
        const linkedCustomer = customersByBannerInternalId.get(customerId)
        const salesDocument = `711-${customerId}-${periodStart}`

        for (const product of products) {
          const { rowNumber, pack, quantity, amount, upc } = product

          if (!linkedCustomer) {
            rejectedRows.push(ERRORS.invalidSiteNumber(rowNumber, customerId))
            continue
          }

          const linkedProduct = upc ? upcProducts.get(upc) : undefined
          if (!linkedProduct) {
            rejectedRows.push(ERRORS.invalidUPC(rowNumber, upc))
            continue
          }

          if (linkedProduct.packSize !== pack) {
            rejectedRows.push(ERRORS.custom(rowNumber, `Pack size mismatch.`))
            continue
          }

          const bottleQuantity = quantity * linkedProduct.packSize
          const existingKey = `${salesDocument}|${linkedCustomer.id}|${linkedProduct.sku}`
          const rowAlreadyExists = existingConfirmedMap.get(existingKey)

          if (rowAlreadyExists) {
            if (rowAlreadyExists.confirmedQuantity !== bottleQuantity || Number(rowAlreadyExists.netValue) !== amount) {
              toUpdate.push({ id: rowAlreadyExists.id, confirmedQuantity: bottleQuantity, netValue: String(amount) })
            } else {
              identicalRows++
            }
          } else {
            toInsert.push({
              sku: linkedProduct.sku,
              confirmedQuantity: bottleQuantity,
              netValue: String(amount),
              salesDocument,
              documentDate: periodStart,
              status: 'Completed',
              salesUnit: linkedProduct.unit ?? undefined,
              customerId: linkedCustomer.id,
              deliveryDate: periodStart,
            })
          }
        }
      }

      const CHUNK_SIZE = 500
      let createdRows = 0
      const updatedRows = toUpdate.length
      await db.transaction(async (tx) => {
        for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
          const newRows = await tx
            .insert(replenOrdersConfirmed)
            .values(toInsert.slice(i, i + CHUNK_SIZE))
            .returning()
          createdRows += newRows.length
        }

        await Promise.all(
          toUpdate.map(({ id, confirmedQuantity, netValue }) =>
            tx
              .update(replenOrdersConfirmed)
              .set({ confirmedQuantity, netValue })
              .where(eq(replenOrdersConfirmed.id, id)),
          ),
        )
      })

      logger.info({ ordersCreated: createdRows, updatedRows }, '7-Eleven confirmed import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sevenElevenConfirmed })
      await updateReportSuccess(report.id, {
        created: createdRows,
        updated: updatedRows,
        rejected: rejectedRows,
        identical: identicalRows,
      })

      return c.json({
        result: {
          created: createdRows,
          updated: updatedRows,
          unit: 'orders',
          status: rejectedRows.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: totalRowsReceived,
          rejected: rejectedRows.length,
          created: createdRows,
          updated: updatedRows,
          deleted: 0,
          identical: identicalRows,
        },
        warnings: rejectedRows,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, '7-Eleven confirmed import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.sevenElevenConfirmed,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * POST /sellin-orders-confirmed/file/circle-k — Import Circle K QC confirmed CSV
   * Same format as QC+ATL sell-out (ERP, Item Description, DATE, VENTES) but CSV instead of Excel.
   */
  .post('/file/circle-k', tokenIsValid, async (c) => {
    logger.info('Circle K Confirmed import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_CIRCLE_K_CONFIRMED,
      type: 'circle-k-confirmed',
      uploadedBy: c.get('user').id,
    })

    try {
      const res = await processCircleKQcConfirmedFile(buffer)

      logger.info(
        { ordersCreated: res.ordersCreated, ordersUpdated: res.ordersUpdated },
        'Circle K Confirmed import success',
      )
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.circleKConfirmed })
      await updateReportSuccess(report.id, {
        created: res.createdRows,
        updated: res.updatedRows,
        rejected: res.rejected,
        identical: res.identicalRows,
      })

      return c.json({
        result: {
          created: res.ordersCreated,
          updated: res.ordersUpdated,
          unit: 'Circle K QC Confirmed orders',
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
      logger.error({ err }, 'Circle K Confirmed import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.circleKConfirmed,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /sellin-orders-confirmed/reports — List import reports for confirmed sell-in orders
   */
  .get('/reports', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_CONFIRMED, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * GET /sellin-orders-confirmed/reports/7-eleven — List import reports for 7-Eleven confirmed orders
   */
  .get('/reports/7-eleven', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_SEVEN_ELEVEN_CONFIRMED, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * GET /sellin-orders-confirmed/reports/circle-k — List import reports for Circle K confirmed orders
   */
  .get('/reports/circle-k', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_CIRCLE_K_CONFIRMED, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })
