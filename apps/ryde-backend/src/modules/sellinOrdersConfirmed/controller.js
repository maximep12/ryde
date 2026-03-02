import moment from 'moment'
import isNull from 'lodash/isNull'

import Customer from 'models/customer'
import CustomerUpc from 'models/customerUpc'
import ProductSku from 'models/productSku'
import ReplenOrderConfirmed from 'models/replenOrderConfirmed'
import Report from 'models/report'

import { readExcelFile } from 'lib/FileParser/excel'
import { parseSevenElevenWHToStore } from 'lib/FileParser/sevenElevenExcel'
import { sendSlackNotification, SLACK_CONTEXT } from 'lib/slack'
import { BANNERS, ERRORS, REPORTS, UPLOAD_RESULT_STATES } from 'utils/constants'

export async function saveSellinConfirmedData(ctx) {
  console.log('[REPORT] - Confirmed start')
  const startTime = moment().format()
  const fileName = ctx.request.header['content-disposition']?.replace('filename=', '') || 'unkown'

  const newReport = await Report.query().insert({
    type: REPORTS.confirmed,
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

    const customers = await Customer.query().select()
    const customerIds = customers.map((c) => c.id)

    const { values } = contentBySheet.find((cbs) => cbs.sheetName === 'Data')

    const availableSkus = await ProductSku.query().select().withGraphFetched('format')

    const existingConfirmed = await ReplenOrderConfirmed.query()
      .select(['id', 'sales_document', 'customer_id', 'sku', 'confirmed_quantity', 'net_value'])
      .whereIn('customer_id', customerIds)

    let ordersCreated = 0
    let ordersUpdated = 0
    let createdRows = 0
    let updatedRows = 0
    let identicalRows = 0
    const rejectedRows = []
    const { create, update } = values.reduce(
      (acc, it) => {
        const {
          row,
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
        } = it

        if (salesDocumentType !== 'OR') {
          rejectedRows.push(ERRORS.custom(row, `SalesDocumentType is not "OR" - ${salesDocumentType} `))
          return acc
        }

        if (Number(confirmedQuantityScheduleLine) === 0) {
          rejectedRows.push(ERRORS.custom(row, `ConfirmedQuantityScheduleLine equals 0`))
          return acc
        }
        if (!customerIds.includes(soldToParty)) {
          rejectedRows.push(ERRORS.invalidERP(row, soldToParty))
          return acc
        }

        const linkedSku = availableSkus.find((as) => as.sku === material)

        if (!linkedSku) {
          rejectedRows.push(ERRORS.invalidSKU(row, material))
          return acc
        }

        if (!linkedSku.format || linkedSku.format.length > 1) {
          rejectedRows.push(ERRORS.custom(row, `More than 1 format linked to this sku.`))
          return acc
        }

        const { format } = linkedSku

        const bottleQuantity = format.numerator * confirmedQuantityScheduleLine

        if (isNull(bottleQuantity)) {
          rejectedRows.push(ERRORS.invalidFormat(row, { sku: material, unit: salesUnit }))
          return acc
        }

        if (reasonForRejection !== '') {
          rejectedRows.push(ERRORS.custom(row, `Reason for rejection is not empty - '${reasonForRejection}'`))
          return acc
        }
        if (overallStatusDescription !== 'Completed') {
          rejectedRows.push(
            ERRORS.custom(row, `OverallStatusDescription is not Completed - '${overallStatusDescription}'`),
          )
          return acc
        }

        const rowAlreadyExists = existingConfirmed.find(
          (e) =>
            String(e.salesDocument) === salesDocument &&
            String(e.customerId) === soldToParty &&
            String(e.sku) === material,
        )

        if (rowAlreadyExists) {
          const convertedValue = (Math.round(netValueItem * 100) / 100).toFixed(2)
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

        const newRow = {
          documentDate: moment.utc(documentDate).format(),
          salesDocument,
          customerId: soldToParty,
          sku: material,
          salesUnit,
          deliveryDate: moment.utc(deliveryDate).format(),
          status: overallStatusDescription,
          rejectionReason: reasonForRejection,
          confirmedQuantity: bottleQuantity,
          netValue: netValueItem,
        }

        return { ...acc, create: [...acc.create, newRow] }
      },
      { create: [], update: [] },
    )

    if (create.length) {
      const newRows = await ReplenOrderConfirmed.query().insert(create)
      ordersCreated = newRows.length
      createdRows = newRows.length
    }

    for (const row of update) {
      await ReplenOrderConfirmed.query()
        .update({ confirmedQuantity: row.newQuantity, netValue: row.newNetValue })
        .where('id', row.id)
      ordersUpdated++
      updatedRows++
    }

    console.log('[REPORT] - Confirmed success')
    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.confirmed })

    await Report.query()
      .update({
        warnings: { rejected: rejectedRows },
        reportEnd: moment().format(),
        created: createdRows,
        updated: updatedRows,
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
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
        deleted: 0, // Not available
        identical: identicalRows,
      },
      warnings: rejectedRows,
    }
  } catch (error) {
    console.log('[REPORT] - Confirmed error: ', error)

    const { code, message } = error

    await sendSlackNotification({ error, context: SLACK_CONTEXT.confirmed })

    await Report.query()
      .update({
        failure: message,
        reportEnd: moment().format(),
        notifSent: true,
      })
      .where('id', newReport.id)

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Confirmed end')
  }
}

export async function save7ElevenConfirmedData(ctx) {
  console.log('[REPORT] - 7 ELEVEN Confirmed start')
  const startTime = moment().format()
  const fileName = ctx.request.header['content-disposition']?.replace('filename=', '') || 'unkown'

  const newReport = await Report.query().insert({
    type: REPORTS.sevenElevenConfirmed,
    reportStart: startTime,
    fileName,
    notifSent: false,
  })

  try {
    const { dateRange, salesByCustomer, totalRowsReceived } = await parseSevenElevenWHToStore({
      stream: ctx.req,
    })

    const customers = await Customer.query().select().where('banner', BANNERS.SEVEN_ELEVEN)
    const customerIds = customers.map((c) => c.id)

    const products = await CustomerUpc.query()
      .select()
      .where('banner', BANNERS.SEVEN_ELEVEN)
      .withGraphFetched('format.skus')

    const SKUS_TO_USE = ['100054', '100051', '100101']

    const upcProducts = products.reduce((acc, it) => {
      const activeSku = it.format.skus.find((s) => SKUS_TO_USE.includes(s.sku))

      if (!activeSku) return acc
      return { ...acc, [it.customerUpc]: { sku: activeSku.sku, packSize: it.format.numerator, unit: it.format.unit } }
    }, {})

    const periodStart = moment.utc(dateRange.start).format('YYYY-MM-DD')

    const existingConfirmed = await ReplenOrderConfirmed.query()
      .select()
      .whereIn('customer_id', customerIds)
      .andWhere('document_date', periodStart)

    let ordersCreated = 0
    const ordersUpdated = 0
    let createdRows = 0
    let updatedRows = 0
    let identicalRows = 0
    const rejectedRows = []

    for (const { customerId, products } of salesByCustomer) {
      const linkedCustomer = customers.find((c) => c.bannerInternalId === customerId)

      const salesDocument = `711-${customerId}-${periodStart}`

      for (const product of products) {
        const { rowNumber, pack, quantity, amount, upc } = product

        if (!linkedCustomer) {
          rejectedRows.push(ERRORS.invalidSiteNumber(rowNumber, customerId))
          continue
        }

        const linkedProduct = upcProducts[upc]

        if (!linkedProduct) {
          rejectedRows.push(ERRORS.invalidUPC(rowNumber, upc))
          continue
        }

        if (linkedProduct.packSize !== pack) {
          rejectedRows.push(ERRORS.custom(rowNumber, `Pack size mismatch.`))
          continue
        }

        const bottleQuantity = quantity * linkedProduct.packSize

        const rowAlreadyExists = existingConfirmed.find(
          (e) =>
            String(e.salesDocument) === salesDocument &&
            String(e.customerId) === linkedCustomer.id &&
            String(e.sku) === linkedProduct.sku,
        )

        if (rowAlreadyExists) {
          if (rowAlreadyExists.confirmedQuantity !== bottleQuantity || Number(rowAlreadyExists.netValue) !== amount) {
            await ReplenOrderConfirmed.query()
              .update({ confirmed_quantity: bottleQuantity, net_value: amount })
              .where('id', rowAlreadyExists.id)

            updatedRows++
          } else {
            identicalRows++
          }
        } else {
          const dbRow = {
            sku: linkedProduct.sku,
            confirmed_quantity: bottleQuantity,
            net_value: amount,
            sales_document: salesDocument,
            document_date: periodStart,
            status: 'Completed',
            sales_unit: linkedProduct.unit,
            customer_id: linkedCustomer.id,
            delivery_date: periodStart,
          }
          await ReplenOrderConfirmed.query().insert(dbRow)
          createdRows++
          ordersCreated++
        }
      }
    }

    console.log('[REPORT] - 7 ELEVEN Confirmed success')
    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sevenElevenConfirmed })

    await Report.query()
      .update({
        warnings: { rejected: rejectedRows },
        reportEnd: moment().format(),
        created: createdRows,
        updated: updatedRows,
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
      result: {
        created: ordersCreated,
        updated: ordersUpdated,
        unit: 'orders',
        status: rejectedRows.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: totalRowsReceived,
        rejected: rejectedRows.length,
        created: createdRows,
        updated: updatedRows,
        deleted: 0, // Not available
        identical: identicalRows,
      },
      warnings: rejectedRows,
    }
  } catch (error) {
    console.log('[REPORT] - 7 ELEVEN Confirmed error: ', error)

    const { code, message } = error

    await sendSlackNotification({ error, context: SLACK_CONTEXT.sevenElevenConfirmed })

    await Report.query()
      .update({
        failure: message,
        reportEnd: moment().format(),
        notifSent: true,
      })
      .where('id', newReport.id)

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - 7 Eleven Confirmed end')
  }
}
