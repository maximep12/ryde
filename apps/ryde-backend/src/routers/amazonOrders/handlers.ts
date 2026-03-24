import { amazonBundlesOrders, amazonOrdersContent, amazonOrders as amazonOrdersTable } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../../db'
import { ContextVariables } from '../../index'
import { parseCsvStream } from '../../lib/FileParser/csv'
import { bufferToStream, receiveFileUpload } from '../../lib/fileUpload'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import { requireRoles } from '../../middlewares/auth'
import { UPLOAD_RESULT_STATES } from '../../utils/constants'
import {
  buildOrdersFromGroup,
  getAmazonBundles,
  getAmazonProductSkus,
  getExistingAmazonOrdersByIds,
  getExistingBundleOrders,
  getReportsByType,
  updateReportFailure,
  updateReportSuccess,
  validateBundleRows,
  validateRawRows,
  validateRows,
} from './helpers'

const REPORT_TYPE_AMAZON = 'AMAZON_ORDERS'
const REPORT_TYPE_AMAZON_BUNDLES = 'AMAZON_BUNDLES'

const logger = createBaseLogger().child({ module: 'amazon-orders' })

const tokenIsValid = requireRoles('admin', 'data_manager')

const amazonOrdersRouter = new Hono<{ Variables: ContextVariables }>()

export const amazonOrdersRouterDefinition = amazonOrdersRouter

  /**
   * POST /amazon-orders/file — Import Amazon orders from TSV
   */
  .post('/file', tokenIsValid, async (c) => {
    logger.info('Amazon import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_AMAZON,
      type: 'amazon',
      uploadedBy: c.get('user').id,
    })

    try {
      const rawData = await parseCsvStream(bufferToStream(buffer), {
        delimiter: '\t',
        columns: [
          'amazon-order-id',
          'purchase-date',
          'order-status',
          'sku',
          'quantity',
          'item-price',
          'ship-state',
          'ship-postal-code',
          'currency',
          'ship-country',
          'sales-channel',
        ],
      })
      const { validRows, rejectedRows: rawRejectedRows } = validateRawRows(rawData)

      const products = await getAmazonProductSkus()
      const parsedOrders = await buildOrdersFromGroup(validRows, products)

      const { validOrders, rejectedRows: orderRejectedRows } = validateRows(parsedOrders, products)
      const rejectedRows = [...rawRejectedRows, ...orderRejectedRows]

      let ordersCreated = 0
      let ordersUpdated = 0
      let rowsCreated = 0
      let rowsUpdated = 0
      let deletedRows = 0
      let identicalRows = 0
      let ordersCancelled = 0

      const existingOrders = await getExistingAmazonOrdersByIds(validOrders.map((o) => o.orderId))
      const existingOrdersMap = new Map(existingOrders.map((e) => [e.orderId, e]))

      // Categorize all operations in a single pass — no DB calls yet
      const newOrders: typeof validOrders = []
      const orderStatusUpdates: { id: number; orderStatus: string; contentLength: number; isCancelled: boolean }[] = []
      const contentInserts: {
        orderId: string
        sku: string
        quantity: number
        netValue: number
        currency: string
        asin: string
        packSize: number | null
      }[] = []
      const contentUpdates: { id: number; quantity: number; netValue: number; currency: string; asin: string }[] = []
      const contentSoftDeletes: { id: number; sku: string }[] = []

      for (const order of validOrders) {
        const linkedOrder = existingOrdersMap.get(order.orderId)

        if (linkedOrder) {
          const statusIsSame = linkedOrder.orderStatus === order.orderStatus
          if (!statusIsSame) {
            orderStatusUpdates.push({
              id: linkedOrder.id,
              orderStatus: order.orderStatus,
              contentLength: order.content.length,
              isCancelled: order.orderStatus === 'Cancelled',
            })
          }

          const existingContentMap = new Map(linkedOrder.content.map((c) => [c.sku, c]))
          for (const rowItem of order.content) {
            const linkedItem = existingContentMap.get(rowItem.sku)
            if (linkedItem) {
              const changed =
                linkedItem.quantity !== rowItem.quantity ||
                linkedItem.netValue !== rowItem.netValue ||
                linkedItem.currency !== rowItem.currency ||
                linkedItem.asin !== rowItem.asin
              if (changed) {
                contentUpdates.push({
                  id: linkedItem.id,
                  quantity: rowItem.quantity,
                  netValue: rowItem.netValue,
                  currency: rowItem.currency,
                  asin: rowItem.asin,
                })
                if (statusIsSame) rowsUpdated++
              } else {
                identicalRows++
              }
            } else {
              contentInserts.push({
                orderId: linkedOrder.orderId,
                sku: rowItem.sku,
                quantity: rowItem.quantity,
                netValue: rowItem.netValue,
                currency: rowItem.currency,
                asin: rowItem.asin,
                packSize: rowItem.packSize,
              })
              rowsCreated++
            }
          }

          // Soft-delete removed content (set quantity to 0)
          if (linkedOrder.content.length > order.content.length) {
            const incomingSkus = new Set(order.content.map((c) => c.sku))
            for (const row of linkedOrder.content) {
              if (!incomingSkus.has(row.sku)) {
                contentSoftDeletes.push({ id: row.id, sku: row.sku })
                deletedRows++
              }
            }
          }
        } else {
          newOrders.push(order)
          ordersCreated++
          rowsCreated += order.content.length
        }
      }

      ordersUpdated = orderStatusUpdates.length
      ordersCancelled = orderStatusUpdates.filter((o) => o.isCancelled).length
      rowsUpdated += orderStatusUpdates.reduce((sum, o) => sum + o.contentLength, 0)

      const CHUNK_SIZE = 500
      await db.transaction(async (tx) => {
        // Insert new orders in batch, then their content
        if (newOrders.length) {
          await tx.insert(amazonOrdersTable).values(
            newOrders.map((o) => ({
              orderId: o.orderId,
              orderDate: o.orderDate,
              orderStatus: o.orderStatus,
              country: o.country,
              shipState: o.shipState,
            })),
          )
          const newContent = newOrders.flatMap((o) =>
            o.content.map((c) => ({
              orderId: o.orderId,
              sku: c.sku,
              quantity: c.quantity,
              netValue: c.netValue,
              currency: c.currency,
              asin: c.asin,
              packSize: c.packSize,
            })),
          )
          if (newContent.length) {
            for (let i = 0; i < newContent.length; i += CHUNK_SIZE) {
              await tx.insert(amazonOrdersContent).values(newContent.slice(i, i + CHUNK_SIZE))
            }
          }
        }

        await Promise.all([
          ...orderStatusUpdates.map(({ id, orderStatus }) =>
            tx.update(amazonOrdersTable).set({ orderStatus }).where(eq(amazonOrdersTable.id, id)),
          ),
          ...contentUpdates.map(({ id, ...fields }) =>
            tx.update(amazonOrdersContent).set(fields).where(eq(amazonOrdersContent.id, id)),
          ),
          ...contentSoftDeletes.map(({ id, sku }) =>
            tx
              .update(amazonOrdersContent)
              .set({ quantity: 0 })
              .where(and(eq(amazonOrdersContent.sku, sku), eq(amazonOrdersContent.id, id))),
          ),
          ...Array.from({ length: Math.ceil(contentInserts.length / CHUNK_SIZE) }, (_, i) =>
            tx.insert(amazonOrdersContent).values(contentInserts.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)),
          ),
        ])
      })

      logger.info({ ordersCreated, ordersUpdated }, 'Amazon import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.amazon })
      await updateReportSuccess(report.id, {
        created: rowsCreated,
        updated: rowsUpdated,
        deleted: deletedRows,
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
          received: validRows.length,
          rejected: rejectedRows.length,
          created: rowsCreated,
          updated: rowsUpdated,
          deleted: deletedRows,
          identical: identicalRows,
        },
        warnings: rejectedRows,
        extra: { ordersCancelled },
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Amazon import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.amazon,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * POST /amazon-orders/bundles — Import Amazon bundle orders from CSV
   */
  .post('/bundles', tokenIsValid, async (c) => {
    logger.info('Amazon bundles import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_AMAZON_BUNDLES,
      type: 'amazon-bundles',
      uploadedBy: c.get('user').id,
    })

    try {
      const rawData = await parseCsvStream(bufferToStream(buffer), {
        columns: ['DATE', 'BUNDLE_ASIN', 'TITLE', 'BUNDLES_SOLD', 'TOTAL_SALES'],
      })
      const data = rawData

      const availableBundles = await getAmazonBundles()
      const { validRows, rejectedRows } = validateBundleRows(data, availableBundles)

      let createdRows = 0
      let updatedRows = 0
      let identicalRows = 0

      const existingOrders = await getExistingBundleOrders()
      const existingBundlesMap = new Map(
        existingOrders.map((o) => [`${new Date(o.date).toISOString().split('T')[0]}|${o.asin}`, o]),
      )

      const toInsert: { asin: string; date: string; quantity: number; netValue: number }[] = []
      const toUpdate: { asin: string; date: string; quantity: number; netValue: number }[] = []

      for (const row of validRows) {
        const r = row as Record<string, string>
        const date = r['date'] ?? ''
        const bundleAsin = r['bundleAsin'] ?? ''
        const quantity = Number(r['bundlesSold'] ?? '0')
        const netValue = Number(r['totalSales'] ?? '0')
        const parsedDate = date ? new Date(date) : null
        const dateStr =
          parsedDate && !isNaN(parsedDate.getTime()) ? (parsedDate.toISOString().split('T')[0] ?? date) : null
        if (!dateStr) continue
        const existing = existingBundlesMap.get(`${dateStr}|${bundleAsin}`)

        if (existing) {
          if (existing.quantity !== quantity || existing.netValue !== netValue) {
            toUpdate.push({ asin: bundleAsin, date: dateStr, quantity, netValue })
            updatedRows++
          } else {
            identicalRows++
          }
        } else {
          toInsert.push({ asin: bundleAsin, date: dateStr, quantity, netValue })
          createdRows++
        }
      }

      await db.transaction(async (tx) => {
        if (toInsert.length) await tx.insert(amazonBundlesOrders).values(toInsert)
        await Promise.all(
          toUpdate.map(({ asin, date, quantity, netValue }) =>
            tx
              .update(amazonBundlesOrders)
              .set({ quantity, netValue })
              .where(and(eq(amazonBundlesOrders.asin, asin), eq(amazonBundlesOrders.date, date))),
          ),
        )
      })

      logger.info({ createdRows, updatedRows }, 'Amazon bundles import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.amazonBundles })
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
          unit: 'bundle orders',
          status: rejectedRows.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: data.length,
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
      logger.error({ err }, 'Amazon bundles import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.amazonBundles,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /amazon-orders/reports — List import reports for Amazon orders
   */
  .get('/reports', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_AMAZON, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * GET /amazon-orders/reports/bundles — List import reports for Amazon bundle orders
   */
  .get('/reports/bundles', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_AMAZON_BUNDLES, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })
