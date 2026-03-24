import { replenOrders, replenOrdersContent } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../../db'
import { ContextVariables } from '../../index'
import { readExcelFile } from '../../lib/FileParser/excel'
import { bufferToStream, receiveFileUpload } from '../../lib/fileUpload'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import { requireRoles } from '../../middlewares/auth'
import { ERRORS, UPLOAD_RESULT_STATES } from '../../utils/constants.js'
import {
  getCustomerIds,
  getProductSkusWithFormats,
  getReplenOrdersWithContent,
  getReportsByType,
  updateReportFailure,
  updateReportSuccess,
} from './helpers'

const REPORT_TYPE_SELLIN = 'SELL_IN_ORDERS'

const logger = createBaseLogger().child({ module: 'sellin-orders' })

const tokenIsValid = requireRoles('admin')

const sellinOrdersRouter = new Hono<{ Variables: ContextVariables }>()

export const sellinOrdersRouterDefinition = sellinOrdersRouter
  .post('/file', tokenIsValid, async (c) => {
    logger.info('Sell-in import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const { buffer, report } = await receiveFileUpload({
      request: c.req.raw,
      fileName,
      reportType: REPORT_TYPE_SELLIN,
      type: 'sell-in',
      uploadedBy: c.get('user').id,
    })

    try {
      const contentBySheet = await readExcelFile({
        stream: bufferToStream(buffer),
        expected: [
          {
            sheetName: 'Data',
            columns: [
              'Sales Organization',
              'Sold-to Party',
              'Billing Date',
              'Billing Document',
              'Product',
              'Sales Document',
              'Created On',
              'Sales Volume Qty',
            ],
          },
        ],
      })

      const sheetData = contentBySheet.find((s) => s.sheetName === 'Data')
      if (!sheetData) throw new HTTPException(400, { message: 'Missing Data sheet' })

      const { values } = sheetData
      const valuesWithoutGrandTotal = values.filter((v) => !isNaN(Number(v.product)))

      const billingDocIdsInFile = [
        ...new Set(
          valuesWithoutGrandTotal
            .map((v) => Number((v as Record<string, unknown>).billingDocument))
            .filter((id) => !isNaN(id)),
        ),
      ]

      const [customerIds, availableSkus, existingOrders] = await Promise.all([
        getCustomerIds(),
        getProductSkusWithFormats(),
        getReplenOrdersWithContent(billingDocIdsInFile),
      ])

      const excluded: string[] = []

      type OrderContent = {
        sku: string
        quantity: number
        billingDocumentId: number
        netValue: null
        salesDocument: number | null
      }
      type ParsedOrder = {
        customerId: number
        billingDate: string
        billingDocumentId: number
        creationDate: string
        content: OrderContent[]
      }

      const customerIdSet = new Set(customerIds)
      const orderMap = new Map<number, ParsedOrder>()

      for (const it of valuesWithoutGrandTotal) {
        const {
          rowNumber,
          soldToParty,
          billingDate,
          billingDocument,
          product,
          salesVolumeQty,
          salesDocument,
          createdOn,
        } = it as Record<string, unknown>

        const customerIdNum = Number(soldToParty)
        if (!customerIdSet.has(customerIdNum)) {
          excluded.push(ERRORS.invalidERP(rowNumber, soldToParty))
          continue
        }

        const linkedSku = availableSkus.find((s) => s.sku === String(product))
        if (!linkedSku) {
          excluded.push(ERRORS.invalidSKU(rowNumber, product))
          continue
        }

        const formattedQuantity = Number(salesVolumeQty)
        if (isNaN(formattedQuantity) || formattedQuantity === 0) {
          excluded.push(ERRORS.invalidQuantity(rowNumber, salesVolumeQty))
          continue
        }

        const denominator = linkedSku.format?.denominator ?? null
        if (denominator === null) {
          excluded.push(ERRORS.invalidFormat(rowNumber, { sku: product, unit: undefined }))
          continue
        }

        const billingDocumentId = Number(billingDocument)
        const contentRow: OrderContent = {
          sku: String(product),
          quantity: formattedQuantity * denominator,
          billingDocumentId,
          netValue: null,
          salesDocument: salesDocument ? Number(salesDocument) : null,
        }

        const existing = orderMap.get(billingDocumentId)
        if (existing) {
          existing.content.push(contentRow)
        } else {
          const billingDateRaw = String(billingDate)
          const createdOnRaw = String(createdOn)
          orderMap.set(billingDocumentId, {
            customerId: customerIdNum,
            billingDate: billingDateRaw.includes('T')
              ? (billingDateRaw.split('T')[0] ?? billingDateRaw)
              : billingDateRaw,
            billingDocumentId,
            creationDate: createdOnRaw.includes('T') ? (createdOnRaw.split('T')[0] ?? createdOnRaw) : createdOnRaw,
            content: [contentRow],
          })
        }
      }

      const orders = Array.from(orderMap.values())

      const existingOrdersMap = new Map(existingOrders.map((eo) => [eo.billingDocumentId, eo]))

      const newOrders: (typeof replenOrders.$inferInsert)[] = []
      const newContentRows: (typeof replenOrdersContent.$inferInsert)[] = []
      const updateOps: { id: number; quantity: number }[] = []
      const deleteIds: number[] = []
      const updatedBillingDocumentIds = new Set<number>()

      let identicalRows = 0

      for (const order of orders) {
        const { customerId, billingDate, billingDocumentId, content, creationDate } = order
        const orderAlreadyExists = existingOrdersMap.get(billingDocumentId)

        if (orderAlreadyExists) {
          for (const contentRow of content) {
            const rowExists = orderAlreadyExists.content.find((c) => c.sku === contentRow.sku)
            if (rowExists) {
              if (
                rowExists.quantity !== contentRow.quantity &&
                String(rowExists.salesDocument) === String(contentRow.salesDocument)
              ) {
                updateOps.push({ id: rowExists.id, quantity: contentRow.quantity })
                updatedBillingDocumentIds.add(billingDocumentId)
              } else {
                identicalRows++
              }
            } else {
              newContentRows.push(contentRow)
              updatedBillingDocumentIds.add(billingDocumentId)
            }
          }

          if (orderAlreadyExists.content.length > content.length) {
            const incomingSkus = new Set(content.map((row) => row.sku))
            for (const row of orderAlreadyExists.content) {
              if (!incomingSkus.has(row.sku)) {
                deleteIds.push(row.id)
                updatedBillingDocumentIds.add(billingDocumentId)
              }
            }
          }
        } else {
          newOrders.push({ customerId, billingDate, billingDocumentId, creationDate })
          newContentRows.push(...content)
        }
      }

      const CHUNK_SIZE = 500
      await db.transaction(async (tx) => {
        const insertOrderOps = []
        for (let i = 0; i < newOrders.length; i += CHUNK_SIZE) {
          insertOrderOps.push(
            tx
              .insert(replenOrders)
              .values(newOrders.slice(i, i + CHUNK_SIZE))
              .onConflictDoNothing(),
          )
        }
        const insertContentOps = []
        for (let i = 0; i < newContentRows.length; i += CHUNK_SIZE) {
          insertContentOps.push(tx.insert(replenOrdersContent).values(newContentRows.slice(i, i + CHUNK_SIZE)))
        }
        await Promise.all([
          ...insertOrderOps,
          ...insertContentOps,
          ...(deleteIds.length
            ? [tx.delete(replenOrdersContent).where(inArray(replenOrdersContent.id, deleteIds))]
            : []),
          ...updateOps.map(({ id, quantity }) =>
            tx.update(replenOrdersContent).set({ quantity }).where(eq(replenOrdersContent.id, id)),
          ),
        ])
      })

      const ordersCreated = newOrders.length
      const ordersUpdated = updatedBillingDocumentIds.size
      const createdRows = newContentRows.length
      const updatedRows = updateOps.length
      const deletedRows = deleteIds.length

      logger.info({ ordersCreated, ordersUpdated }, 'Sell-in import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sellin })
      await updateReportSuccess(report.id, {
        created: createdRows,
        updated: updatedRows,
        deleted: deletedRows,
        rejected: excluded,
        identical: identicalRows,
      })

      return c.json({
        result: {
          created: ordersCreated,
          updated: ordersUpdated,
          unit: 'orders',
          status: excluded.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: values.length,
          rejected: excluded.length,
          created: createdRows,
          updated: updatedRows,
          deleted: deletedRows,
          identical: identicalRows,
        },
        warnings: excluded,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Sell-in import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.sellin,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })
  .get('/reports', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_SELLIN, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })
