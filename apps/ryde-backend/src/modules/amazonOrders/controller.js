import moment from 'moment'

import Report from 'models/report'

import {
  buildOrdersFromGroup,
  processBundleRows,
  updateAmazonOrders,
  validateBundleRows,
  validateRows,
} from './helpers'
import { REPORTS, UPLOAD_RESULT_STATES } from 'utils/constants'
import { tsvStringToJson, csvToJson } from 'helpers'
import { sendSlackNotification, SLACK_CONTEXT } from 'lib/slack'

export async function saveAmazonFile(ctx) {
  console.log('[REPORT] - Amazon start')

  const file = ctx.req
  const fileName = ctx.request.header['content-disposition']?.replace('filename=', '')

  const startTime = moment().format()

  const newReport = await Report.query().insert({
    type: REPORTS.amazon,
    reportStart: startTime,
    fileName,
    notifSent: false,
  })

  try {
    const fileContent = await new Response(file).text()
    const expectedColumns = [
      'amazon-order-id',
      'purchase-date',
      'order-status',
      'product-name',
      'sku',
      'quantity',
      'item-price',
      'ship-state',
      'ship-postal-code',
      'currency',
      'ship-country',
    ]
    const data = tsvStringToJson({ fileContent, expected: expectedColumns }).filter((row) => row.amazonOrderId)
    const amazonOrders = await buildOrdersFromGroup({ data })

    const validatedUpdateRows = await validateRows({ orders: amazonOrders })
    const { rowsCreated, rowsUpdated, deletedRows, identicalRows, ordersCreated, ordersUpdated, ordersCancelled } =
      await updateAmazonOrders({
        orders: validatedUpdateRows.validOrders,
      })

    console.log('[REPORT] - Amazon success')
    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.amazon })
    await Report.query()
      .update({
        type: REPORTS.amazon,
        warnings: { rejectedRows: validatedUpdateRows.rejectedRows },
        reportEnd: moment().format(),
        created: rowsCreated,
        updated: rowsUpdated,
        extra: { ordersCancelled },
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
      result: {
        created: ordersCreated,
        updated: ordersUpdated,
        unit: 'orders',
        status: validatedUpdateRows.rejectedRows.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: data.length,
        rejected: validatedUpdateRows.rejectedRows.length,
        created: rowsCreated,
        updated: rowsUpdated,
        deleted: deletedRows,
        identical: identicalRows,
      },
      warnings: validatedUpdateRows.rejectedRows,
    }
  } catch (error) {
    const { code, message } = error

    console.log('[REPORT] - Amazon error: ', error)
    await sendSlackNotification({ error, context: SLACK_CONTEXT.amazon })
    await Report.query()
      .update({
        failure: message,
        reportEnd: moment().format(),
        notifSent: true,
      })
      .where('id', newReport.id)

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Amazon end')
  }
}

export async function saveAmazonBundlesFile(ctx) {
  console.log('[REPORT] - Amazon bundles start')
  const file = ctx.req
  const fileName = ctx.request.header['content-disposition']?.replace('filename=', '')

  const startTime = moment().format()

  const newReport = await Report.query().insert({
    type: REPORTS.amazonBundles,
    reportStart: startTime,
    fileName,
    notifSent: false,
  })

  try {
    const fileContent = await new Response(file).text()
    const expectedColumns = ['DATE', 'BUNDLE_ASIN', 'TITLE', 'BUNDLES_SOLD', 'TOTAL_SALES']
    const data = csvToJson({ content: fileContent, separator: '\n', expectedColumns })

    const { validRows, rejectedRows } = await validateBundleRows({ rows: data })

    const { createdRows, updatedRows, identicalRows } = await processBundleRows(validRows)

    console.log('[REPORT] - Amazon bundles success')
    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.amazonBundles })
    await Report.query()
      .update({
        type: REPORTS.amazon,
        warnings: { rejectedRows },
        reportEnd: moment().format(),
        created: createdRows,
        updated: updatedRows,
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
      result: {
        created: createdRows,
        updated: updatedRows,
        unit: 'bundles orders',
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
    }
  } catch (error) {
    const { code, message } = error

    console.log('[REPORT] - Amazon bundles error: ', error)
    await sendSlackNotification({ error, context: SLACK_CONTEXT.amazonBundles })
    await Report.query()
      .update({
        failure: message,
        reportEnd: moment().format(),
        notifSent: true,
      })
      .where('id', newReport.id)

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Amazon bundles end')
  }
}
