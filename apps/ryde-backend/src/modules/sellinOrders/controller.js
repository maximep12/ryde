import moment from 'moment'
import isNull from 'lodash/isNull'

import Customer from 'models/customer'
import ProductSku from 'models/productSku'
import ReplenOrder from 'models/replenOrder'
import ReplenOrderContent from 'models/replenOrderContent'
import Report from 'models/report'

import { readExcelFile } from 'lib/FileParser/excel'
import { ERRORS, REPORTS, UPLOAD_RESULT_STATES } from 'utils/constants'
import { sendSlackNotification, SLACK_CONTEXT } from 'lib/slack'

export async function saveSellinData(ctx) {
  console.log('[REPORT] - Sell-in start')
  const startTime = moment().format()
  const fileName = ctx.request.header['content-disposition']?.replace('filename=', '') || 'unknown'

  const newReport = await Report.query().insert({
    type: REPORTS.sellin,
    reportStart: startTime,
    fileName,
    notifSent: false,
  })

  try {
    const contentBySheet = await readExcelFile({
      stream: ctx.req,
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

    const { values } = contentBySheet.find((cbs) => cbs.sheetName === 'Data')

    const valuesWithoutGrandTotal = values.filter((v) => !isNaN(v.product))

    const productSkus = await ProductSku.query().select().withGraphFetched('format')

    const customers = await Customer.query().select()
    const existingOrders = await ReplenOrder.query().select('*').withGraphFetched('content')

    const customerIds = customers.map((customer) => customer.id)
    const excluded = []
    const orders = valuesWithoutGrandTotal.reduce((acc, it) => {
      const { row, soldToParty, billingDate, billingDocument, product, salesVolumeQty, salesDocument, createdOn } = it

      if (!customerIds.includes(soldToParty)) {
        excluded.push(ERRORS.invalidERP(row, soldToParty))
        return acc
      }

      const linkedSku = productSkus.find((productSku) => productSku.sku === product.toString())
      if (!linkedSku) {
        excluded.push(ERRORS.invalidSKU(row, product))
        return acc
      }

      const formattedQuantity = Number(salesVolumeQty)
      const invalidQuantity = isNaN(Number(formattedQuantity)) || formattedQuantity === 0
      if (invalidQuantity) {
        excluded.push(ERRORS.invalidQuantity(row, salesVolumeQty))
        return acc
      }

      const { denominator } = linkedSku.format
      const units = formattedQuantity * denominator

      if (isNull(units)) {
        excluded.push(ERRORS.invalidFormat(row, { sku: product }))
        return acc
      }

      const formattedBillingDate = moment.utc(billingDate).format()
      const formattedCreatedOn = moment.utc(createdOn).format()

      const orderAlreadyGenerated = acc.find((orderCreated) => orderCreated.billingDocumentId === billingDocument)

      if (orderAlreadyGenerated) {
        const ordersWithoutActual = acc.filter((order) => order.billingDocumentId !== billingDocument)
        orderAlreadyGenerated.content.push({
          sku: product,
          quantity: units,
          billingDocumentId: billingDocument,
          netValue: null,
          salesDocument,
        })

        return [...ordersWithoutActual, orderAlreadyGenerated]
      } else {
        const newOrder = {
          customerId: soldToParty,
          billingDate: formattedBillingDate,
          billingDocumentId: billingDocument,
          creationDate: formattedCreatedOn,
          content: [
            {
              sku: product,
              quantity: units,
              billingDocumentId: billingDocument,
              netValue: null,
              salesDocument,
            },
          ],
        }
        return [...acc, newOrder]
      }
    }, [])

    let ordersCreated = 0
    let ordersUpdated = 0
    let createdRows = 0
    let updatedRows = 0
    let deletedRows = 0
    let identicalRows = 0
    for (const order of orders) {
      const { customerId, billingDate, billingDocumentId, content, creationDate } = order
      const orderAlreadyExists = existingOrders.find((eo) => String(eo.billingDocumentId) === billingDocumentId)
      if (orderAlreadyExists) {
        let orderWasUpdated = false
        for (const contentRow of content) {
          const rowExists = orderAlreadyExists.content.find((content) => String(content.sku) === contentRow.sku)
          if (rowExists) {
            if (
              rowExists.quantity !== contentRow.quantity &&
              rowExists.salesDocument.toString() === contentRow.salesDocument
            ) {
              await ReplenOrderContent.query().update({ quantity: contentRow.quantity }).where('id', rowExists.id)
              updatedRows++
              orderWasUpdated = true
            } else {
              identicalRows++
            }
          } else {
            await ReplenOrderContent.query().insert(contentRow)
            ordersCreated++
          }
        }

        if (orderAlreadyExists.content.length > order.content.length) {
          const toDelete = orderAlreadyExists.content.filter(
            (content) => !order.content.map((c) => c.sku).includes(content),
          )

          for (const row of toDelete) {
            await ReplenOrderContent.query().delete().where('id', row.id)
            deletedRows++
            orderWasUpdated = true
          }
        }
        if (orderWasUpdated) ordersUpdated++
      } else {
        await ReplenOrder.query()
          .insert({ customerId, billingDate, billingDocumentId, creationDate })
          .onConflict()
          .ignore()
        ordersCreated++

        for (const quantity of content) {
          await ReplenOrderContent.query().insert(quantity)
          createdRows++
        }
      }
    }

    console.log('[REPORT] - Sell-in success')
    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sellin })
    await Report.query()
      .update({
        warnings: { rejected: excluded },
        reportEnd: moment().format(),
        created: createdRows,
        updated: updatedRows,
        deleted: deletedRows,
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
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
    }
  } catch (error) {
    console.log('[REPORT] - Sell-in error: ', JSON.stringify(error))
    const { message, code } = error

    await sendSlackNotification({
      error,
      context: SLACK_CONTEXT.sellin,
    })

    await Report.query()
      .update({
        failure: message,
        reportEnd: moment().format(),
        notifSent: true,
      })
      .where('id', newReport.id)

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Sell-in end')
  }
}
