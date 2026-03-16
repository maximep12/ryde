import Promise from 'bluebird'
import moment from 'moment'
import { max, min } from 'moment/moment'

import first from 'lodash/first'
import groupBy from 'lodash/groupBy'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import round from 'lodash/round'
import sumBy from 'lodash/sumBy'
import uniq from 'lodash/uniq'

import CompetitorOrder from 'models/competitorOrder'
import CompetitorSale from 'models/competitorSale'
import Customer from 'models/customer'
import CustomerUpc from 'models/customerUpc'
import DataImport from 'models/dataImports'
import Order from 'models/order'
import OrderContent from 'models/orderContent'
import ProductFormat from 'models/productFormat'
import ProductSku from 'models/productSku'
import ReplenOrder from 'models/replenOrder'
import Report from 'models/report'

import { refreshCustomerVelocity } from 'models/customerVelocity'

import { tsvStringToJson } from 'helpers'
import { parseCircleKSellOut } from 'lib/FileParser/circleKExcel'
import { readExcelFile } from 'lib/FileParser/excel'
import { parseParklandSellOut } from 'lib/FileParser/parklandExcel'
import { parsePetroCanadaSellOut } from 'lib/FileParser/petroCanadaExcel'
import { parseSevenElevenSellOut } from 'lib/FileParser/sevenElevenExcel'
import { BANNERS, ERRORS, REPORTS } from 'utils/constants'
import FileLevelError from 'utils/FileLevelError'

function buildInvalidCustomerErrors(invalidCustomers) {
  const customerRows = groupBy(invalidCustomers, 'id')
  return Object.entries(customerRows)
    .map(([id, entries]) => ({
      id,
      rows: entries.flatMap((e) => e.rows).sort((a, b) => a - b),
    }))
    .map(({ id, rows }) => ERRORS.invalidSiteNumber(rows.join(', '), id))
}

export async function createRabbaCompetitorSales({
  rydeOrders,
  othersOrders,
  customerId,
  dataImportId,
  competitorData,
  orderDate,
}) {
  const compOrders = Object.values(othersOrders)

  const data = {
    rydeUnits: sumBy(rydeOrders, 'quantity'),
    rydeValue: round(sumBy(rydeOrders, 'netValue'), 2),
    romUnits: sumBy(compOrders, 'quantity'),
    romValue: round(sumBy(compOrders, 'netValue'), 2),
    customerId,
    fileImport: dataImportId,
  }

  const linkedData = competitorData?.competitorSales.find((cd) => cd.customerId === customerId)

  // Create Competitor Orders if not exist
  // If exist, validate quantities
  // If it already exist, but not in the current import, delete it
  const existingCompetitorOrders = await CompetitorOrder.query()
    .select('*')
    .where('customer_id', customerId)
    .andWhere('order_date', moment(orderDate).format('YYYY-MM-DD'))

  const compOrdersArray = Object.entries(othersOrders)

  // Process each brand in othersOrders
  for (const [brand, orderData] of compOrdersArray) {
    const existingOrder = existingCompetitorOrders.find((order) => order.brand === brand)

    if (existingOrder) {
      // Validate and update if the amount is different
      if (existingOrder.quantity !== orderData.quantity || existingOrder.value !== orderData.netValue) {
        await CompetitorOrder.query()
          .update({
            quantity: orderData.quantity,
            value: round(orderData.netValue, 2),
          })
          .where('id', existingOrder.id)
      }
    } else {
      // Create a new Competitor Order if brand is in othersOrders but not in existing orders
      await CompetitorOrder.query().insert({
        customerId,
        brand,
        quantity: orderData.quantity,
        value: round(orderData.netValue, 2),
        orderDate: moment(orderDate).format('YYYY-MM-DD'),
      })
    }
  }

  // Delete orders for brands that are no longer in othersOrders
  for (const existingOrder of existingCompetitorOrders) {
    if (!othersOrders[existingOrder.brand]) {
      await CompetitorOrder.query().deleteById(existingOrder.id)
    }
  }

  if (linkedData) {
    await CompetitorSale.query().patch(data).findById(linkedData.id)
  } else {
    await CompetitorSale.query().insert(data)
  }
}

export async function createRabbaWeeklyOrder({ rydeOrders, orderDate, customerId }) {
  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0

  if (!rydeOrders.length) return { ordersCreated, ordersUpdated, createdRows, updatedRows, deletedRows, identicalRows }

  let order = await Order.query().select().where('order_date', orderDate).andWhere('customer_id', customerId).first()

  if (!order) {
    order = await Order.query().insert({ customerId, orderDate })
    ordersCreated++
  }

  const byUpc = groupBy(rydeOrders, 'upc')
  const sumByUpc = Object.entries(byUpc).reduce((acc, [upc, amounts]) => {
    const sums = {
      quantity: sumBy(amounts, 'quantity'),
      netValue: round(sumBy(amounts, 'netValue'), 2),
      sku: first(amounts).sku,
      upc,
      billingDocumentId: order.id,
    }
    if (sums.quantity === 0 || sums.netValue === 0) return acc

    return [...acc, sums]
  }, [])

  const contentRows = await OrderContent.query().select().where('billing_document_id', order.id)
  const rowsToDelete = contentRows.filter((cr) => !sumByUpc.map((abs) => abs.upc).includes(cr.upc))
  if (rowsToDelete.length) {
    await OrderContent.query()
      .delete()
      .whereIn(
        'id',
        rowsToDelete.map((rtd) => rtd.id),
      )
    deletedRows += rowsToDelete.length
  }
  for (const upcValue of sumByUpc) {
    const existingValue = contentRows.find((cr) => cr.upc === upcValue.upc)
    if (existingValue) {
      if (existingValue.quantity !== upcValue.quantity || existingValue.netValue !== upcValue.netValue) {
        await OrderContent.query().patch(upcValue).where('id', existingValue.id)
        updatedRows++
        ordersUpdated = 1
      } else {
        identicalRows++
      }
    } else {
      await OrderContent.query().insert(upcValue)
      createdRows++
    }
  }

  // AmountBysku merges similar sku to a single row
  // Which can make 3 rows beign interpreted as 1
  // If we did not create
  identicalRows = ordersCreated === 1 ? 0 : rydeOrders.length - createdRows - updatedRows

  return { ordersCreated, ordersUpdated, createdRows, updatedRows, deletedRows, identicalRows }
}

export async function createRabbaData({ fileContent }) {
  const values = tsvStringToJson({
    fileContent,
    delimiter: ',',
    expected: ['WEEKEND', 'STORE#', 'STOREADDR', 'STORECITY', 'BRAND', 'UPC', 'UNITS', 'SALESQTY', 'SALESAMT'],
  }).filter((x) => x.weekend !== '')

  const rowValues = values.map((v, index) => ({ ...v, row: index + 1 }))

  const productFormats = await CustomerUpc.query()
    .select()
    .where('banner', BANNERS.RABBA)
    .withGraphFetched('format.product.skus(onlyStoresActive)')

  const query = `
      SELECT
        distinct sku
      from replen_orders
      join replen_orders_content on replen_orders_content.billing_document_id = replen_orders.billing_document_id
      join customers on customers.id = replen_orders.customer_id
      where banner = '${BANNERS.RABBA}'
      order by sku asc
    `
  const { rows: soldInSkus } = await CustomerUpc.knex().raw(query)
  const availableSkus = soldInSkus.map((entry) => entry.sku)

  let fileDate
  for (const rowValue of rowValues) {
    if (!fileDate) fileDate = rowValue.weekend
    else {
      if (fileDate !== rowValue.weekend) {
        throw new FileLevelError(
          ERRORS.invalidDates(fileDate, {
            row: rowValue.row,
            date: rowValue.weekend,
          }),
        )
      }
    }
  }

  const rabbaCustomers = await Customer.query().select().where('banner', BANNERS.RABBA)
  const previousMonday = moment(fileDate, 'DD-MMM-YY').startOf('isoWeek')
  const nextSunday = moment(fileDate, 'DD-MMM-YY').endOf('isoWeek')

  const competitorData = await DataImport.query()
    .withGraphFetched('competitorSales')
    .where('period_start', previousMonday.format('YYYY-MM-DD'))
    .andWhere('period_end', nextSunday.format('YYYY-MM-DD'))
    .andWhere('file_origin', BANNERS.RABBA)
    .first()

  const dataImport =
    competitorData ||
    (await DataImport.query().insert({
      periodStart: previousMonday.format('YYYY-MM-DD'),
      periodEnd: nextSunday.format('YYYY-MM-DD'),
      weeksIncluded: 1,
      rydeWeek: moment(fileDate, 'DD-MMM-YY').diff(moment('2023-11-06'), 'week'),
      fileOrigin: BANNERS.RABBA,
    }))

  const RYDE_BRANDS = ['RYDE SHOT', 'C-RYDE SHOT']
  const COMPETITORS = ['DOSE ENERGYSHOT', 'DOSE SHOT', '5 HOUR']

  const rejected = []

  const validRows = rowValues.reduce((acc, r) => {
    const { row, store: storeId, brand, upc, storeaddr: storeAddress, storecity: city, units, salesqty, salesamt } = r

    r.address = { address: storeAddress, city }

    const existingCustomer = rabbaCustomers.find((customer) => customer.bannerInternalId === storeId)
    if (!existingCustomer) {
      rejected.push(ERRORS.invalidERP(row, storeId))
      return acc
    }

    if (Number(salesqty) === 0) {
      rejected.push(ERRORS.invalidQuantity(row, salesamt))
      return acc
    }

    if (Number(salesamt) === 0) {
      rejected.push(ERRORS.custom(row, `Salesamt equals 0`))
      return acc
    }

    if (RYDE_BRANDS.includes(brand)) {
      const linkedFormat = productFormats.find((x) => Number(x.customerUpc) === Number(upc))
      if (!linkedFormat) {
        rejected.push(ERRORS.custom(row, `Unknown UPC provided: ${upc}. Please contact Volume 7 to validate.`))
        return acc
      }

      if (linkedFormat.format.product.skus.length === 1) {
        r.sku = first(linkedFormat.format.product.skus).sku
      } else {
        const soldInSku = linkedFormat.format.product.skus.find((sku) => availableSkus.includes(sku.sku))
        if (soldInSku) {
          r.sku = soldInSku.sku
        } else {
          rejected.push(
            ERRORS.custom(row, `Was not able to find the specific SKU. Please contact Volume 7 to validate.`),
          )
          return acc
        }
      }

      r.upc = linkedFormat.format.upc
    }

    let quantity = Number(salesqty)
    if (units.includes('x')) {
      const amountAndSize = units.match(/\d+/g)

      if (amountAndSize.length !== 2) {
        rejected.push(ERRORS.invalidUnit(row, units))
        return acc
      }

      quantity *= first(amountAndSize)
    }
    if (Number(salesamt) < 0) {
      quantity *= -1
    }

    return [...acc, { ...r, quantity }]
  }, [])

  const customersData = groupBy(validRows, 'store')

  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0

  for (const [storeId, orders] of Object.entries(customersData)) {
    const customer = rabbaCustomers.find((customer) => customer.bannerInternalId === storeId)

    let address = { city: '', address: '' }

    const { ryde, others } = orders.reduce(
      (acc, r) => {
        const { brand, quantity, salesamt: netValue, sku, upc } = r
        if (RYDE_BRANDS.includes(brand)) {
          address = r.address
          return {
            ...acc,
            ryde: [...acc.ryde, { quantity, netValue: Number(netValue), sku, upc }],
          }
        }
        if (COMPETITORS.includes(brand)) {
          return {
            ...acc,
            others: { ...acc.others, [brand]: { quantity, netValue: Number(netValue), sku, upc } },
          }
        }
        return acc
      },
      { ryde: [], others: [] },
    )

    identicalRows += others.length

    if (!isEqual(customer.address, address)) {
      await Customer.query().update({ address }).where({ id: customer.id })
      customer.address = address
    }

    await createRabbaCompetitorSales({
      rydeOrders: ryde,
      othersOrders: others,
      customerId: customer.id,
      dataImportId: dataImport.id,
      competitorData,
      orderDate: previousMonday,
    })

    const ordersCreationResult = await createRabbaWeeklyOrder({
      rydeOrders: ryde,
      customerId: customer.id,
      orderDate: previousMonday,
    })

    ordersCreated += ordersCreationResult.ordersCreated
    ordersUpdated += ordersCreationResult.ordersUpdated
    createdRows += ordersCreationResult.createdRows
    updatedRows += ordersCreationResult.updatedRows
    deletedRows += ordersCreationResult.deletedRows
    identicalRows += ordersCreationResult.identicalRows
  }

  return {
    received: values.length,
    ordersCreated,
    ordersUpdated,
    rejected,
    createdRows,
    updatedRows,
    deletedRows,
    identicalRows,
    dataImportId: dataImport.id,
  }
}

export async function createCentralMarketData({ fileName, fileContent, s3FileName }) {
  const uploadResult = {}
  const reportStart = moment()

  const contentBySheet = await readExcelFile({
    stream: fileContent,
    expected: [
      {
        sheetName: 'Data',
        columns: ['SKU', 'ID', 'Quantity', 'Net Value', 'Date'],
      },
    ],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName.includes('Data'))

  if (!reportData) throw new FileLevelError('Missing weekly report data.')
  const dataRows = reportData.values.map((rd) => ({
    ...rd,
    date: moment.utc(rd.date).format('YYYY-MM-DD'),
  }))

  const dates = uniq(dataRows.map((row) => row.date))
  if (dates.length !== 1) throw new FileLevelError('All dates should be the same.')

  const importedMonth = first(dates)
  const startOfMonth = moment.utc(importedMonth).startOf('month')
  const endOfMonth = moment.utc(importedMonth).endOf('month')

  const periodStart = startOfMonth.format('YYYY-MM-DD')
  const periodEnd = endOfMonth.format('YYYY-MM-DD')

  const newReport = await Report.query().insert({
    type: REPORTS.centralMarket,
    reportStart,
    fileName,
    notifSent: false,
  })

  const dataImport =
    (await DataImport.query()
      .where('period_start', periodStart)
      .andWhere('period_end', periodEnd)
      .andWhere('file_origin', BANNERS.CENTRAL_MARKET)
      .first()) ||
    (await DataImport.query().insert({
      periodStart,
      periodEnd,
      weeksIncluded: moment
        .utc(importedMonth)
        .startOf('isoWeek')
        .diff(moment.utc(importedMonth).endOf('isoWeek'), 'weeks'),
      rydeWeek: moment(startOfMonth.startOf('isoWeek')).diff(moment('2023-11-06'), 'week'),
      fileOrigin: BANNERS.CENTRAL_MARKET,
    }))

  if (reportData) {
    try {
      const { result, rows } = await saveCentralMarketData({
        data: dataRows,
        periodStart: moment.utc(importedMonth).startOf('month'),
        periodEnd: moment.utc(importedMonth).endOf('month'),
        dataImport,
      })
      uploadResult.result = result
      uploadResult.rows = rows

      await Report.query()
        .update({
          warnings: { rejected: rows.rejected },
          reportEnd: moment().format(),
          created: rows.createdRows,
        })
        .where('id', newReport.id)

      return uploadResult
    } catch (e) {
      await Report.query()
        .update({
          failure: e.message,
          reportEnd: moment().format(),
        })
        .where('id', newReport.id)
      throw e
    }
  }
}

export async function createLoblawsData({ fileName, fileContent, s3FileName, reportId }) {
  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejectedRows: [],
    },
  }

  const values = tsvStringToJson({
    fileContent,
    delimiter: ',',
    expected: ['Week End Date', 'UPC', 'Site Number', 'Sales', 'Units'],
  }).filter((x) => x.weekEndDate !== '')

  const dataRows = values.map((rd, index) => ({
    customerId: rd.siteNumber,
    date: moment.utc(new Date(rd.weekEndDate)).startOf('isoWeek').format('YYYY-MM-DD'),
    productUpc: rd.upc,
    netValue: Number(rd.sales),
    quantity: Number(rd.units),
    row: index + 1,
  }))

  const weeklySales = groupBy(dataRows, 'date')
  const includesMultipleWeeks = Object.keys(weeklySales).length > 1
  for (const [salesDate, sales] of Object.entries(weeklySales)) {
    const periodStart = moment(salesDate).format('YYYY-MM-DD')
    const periodEnd = moment.utc(salesDate).endOf('isoWeek').format('YYYY-MM-DD')

    const fileIsAlreadyImported = await DataImport.query()
      .where('period_start', periodStart)
      .andWhere('period_end', periodEnd)
      .andWhere('file_origin', BANNERS.LOBLAWS)
      .first()

    const file =
      fileIsAlreadyImported ||
      (await DataImport.query().insert({
        periodStart,
        periodEnd,
        weeksIncluded: 1,
        rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
        fileOrigin: BANNERS.LOBLAWS,
      }))

    if (!includesMultipleWeeks) {
      uploadResult.dataImportId = file.id
    }

    const competitorData = await DataImport.query()
      .withGraphFetched('competitorSales')
      .where('period_start', periodStart)
      .andWhere('period_end', periodEnd)
      .andWhere('file_origin', BANNERS.LOBLAWS)
      .first()

    const dataImport =
      competitorData ||
      (await DataImport.query().insert({
        periodStart,
        periodEnd,
        weeksIncluded: 1,
        rydeWeek: moment(periodStart, 'DD-MMM-YY').diff(moment('2023-11-06'), 'week'),
        fileOrigin: BANNERS.LOBLAWS,
      }))

    const { result, rows } = await saveLoblawsData({
      data: sales,
      periodStart,
      dataImport: dataImport.id,
    })

    uploadResult.result = {
      ordersCreated: (uploadResult.result.ordersCreated += result.ordersCreated),
      ordersUpdated: (uploadResult.result.ordersUpdated += result.ordersUpdated),
      ordersDeleted: (uploadResult.result.ordersDeleted += result.ordersDeleted),
    }
    uploadResult.rows = {
      createdRows: (uploadResult.rows.createdRows += rows.createdRows),
      updatedRows: (uploadResult.rows.updatedRows += rows.updatedRows),
      deletedRows: (uploadResult.rows.deletedRows += rows.deletedRows),
      identicalRows: (uploadResult.rows.identicalRows += rows.identicalRows),
      rejectedRows: [...uploadResult.rows.rejectedRows, ...rows.rejected],
    }

    try {
      await Report.query()
        .update({
          warnings: { rejected: uploadResult.rows.rejected },
          reportEnd: moment().format(),
          created: uploadResult.rows.createdRows,
        })
        .where('id', reportId)
    } catch (e) {
      await Report.query()
        .update({
          failure: e.message,
          reportEnd: moment().format(),
        })
        .where('id', reportId)
    }
  }

  return uploadResult
}

export async function createCircleKQcAtlData({ fileContent }) {
  const contentBySheet = await readExcelFile({
    stream: fileContent,
    expected: [
      {
        sheetName: 'Export',
        columns: ['ERP', 'Item Description', 'DATE', 'VENTES'],
      },
    ],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName === 'Export')

  if (!reportData) throw new FileLevelError('Missing expected Export sheet.')

  const receivedRows = reportData.values

  const INVALID_DATE = 'Invalid date'

  // Group rows by week (date is a Sunday, move to previous Monday)
  const rowsByWeek = groupBy(receivedRows, (rd) => {
    if (!rd.date) return INVALID_DATE
    return moment.utc(rd.date).startOf('isoWeek').format('YYYY-MM-DD')
  })

  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [],
      received: receivedRows.length,
      invalidCustomers: [],
    },
    reportIds: [],
  }

  const customers = await Customer.query().select().where('banner', 'like', `%${BANNERS.CIRCLE_K.search}%`)
  const SKUS_TO_USE = [
    { sku: '100054', product: 'DETENTE' },
    { sku: '100051', product: 'ENERGIE' },
    { sku: '100101', product: 'FOCUS' },
  ]

  for (const [weekStart, weekRows] of Object.entries(rowsByWeek)) {
    if (weekStart === INVALID_DATE) continue
    const periodStart = moment.utc(weekStart)
    const periodEnd = moment.utc(weekStart).endOf('isoWeek')

    const dataImport =
      (await DataImport.query()
        .where('period_start', periodStart.format('YYYY-MM-DD'))
        .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
        .andWhere('file_origin', BANNERS.CIRCLE_K.global)
        .first()) ||
      (await DataImport.query().insert({
        periodStart: periodStart.format('YYYY-MM-DD'),
        periodEnd: periodEnd.format('YYYY-MM-DD'),
        weeksIncluded: 1,
        rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
        fileOrigin: BANNERS.CIRCLE_K.global,
      }))

    const { result, rows } = await saveCircleKQcAtlData({
      data: weekRows,
      periodStart,
      periodEnd,
      dataImport,
      customers,
      products: SKUS_TO_USE,
    })

    uploadResult.reportIds.push(dataImport.id)
    uploadResult.result.ordersCreated += result.ordersCreated
    uploadResult.result.ordersUpdated += result.ordersUpdated
    uploadResult.result.ordersDeleted += result.ordersDeleted
    uploadResult.rows.createdRows += rows.createdRows
    uploadResult.rows.updatedRows += rows.updatedRows
    uploadResult.rows.deletedRows += rows.deletedRows
    uploadResult.rows.identicalRows += rows.identicalRows
    uploadResult.rows.rejected = [...uploadResult.rows.rejected, ...rows.rejected]
    uploadResult.rows.invalidCustomers = [...uploadResult.rows.invalidCustomers, ...rows.invalidCustomers]
  }

  uploadResult.rows.rejected = [
    ...uploadResult.rows.rejected,
    ...buildInvalidCustomerErrors(uploadResult.rows.invalidCustomers),
    ERRORS.custom(rowsByWeek[INVALID_DATE].map((r) => r.rowNumber).join(', '), 'Invalid date provided'),
  ]

  return uploadResult
}

async function saveCircleKQcAtlData({ data, periodStart, periodEnd, dataImport, customers, products }) {
  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0
  const rejected = []
  const invalidCustomers = []

  const existingOrders = await Order.query()
    .withGraphFetched('content')
    .whereIn(
      'customer_id',
      customers.map((c) => c.id),
    )
    .andWhere('order_date', '>=', periodStart.format('YYYY-MM-DD'))
    .andWhere('order_date', '<=', periodEnd.format('YYYY-MM-DD'))

  const byStore = groupBy(data, 'erp')

  for (const [erp, storeRows] of Object.entries(byStore)) {
    if (erp === '') {
      invalidCustomers.push({ id: '(empty)', rows: storeRows.map((r) => r.row) })
      continue
    }
    const customer = customers.find((c) => String(c.batId) === String(erp))

    if (!customer) {
      invalidCustomers.push({ id: erp, rows: storeRows.map((r) => r.row) })
      continue
    }

    const content = []
    for (const storeRow of storeRows) {
      const quantity = Number(storeRow.ventes)
      if (!quantity || quantity === 0) continue

      const linkedProduct = products.find((p) => storeRow.itemDescription.includes(p.product))

      if (!linkedProduct) {
        rejected.push(
          ERRORS.custom(storeRow.row, `Could not map Item Description "${storeRow.itemDescription}" to a product`),
        )
        continue
      }

      content.push({ sku: linkedProduct.sku, quantity, netValue: 0, upc: storeRow.itemDescription })
    }

    if (content.length === 0) continue

    const orderDate = periodStart.format('YYYY-MM-DD')
    const orderAlreadyExists = existingOrders.find(
      (o) => String(o.customerId) === String(customer.id) && moment(o.orderDate).format('YYYY-MM-DD') === orderDate,
    )

    if (orderAlreadyExists) {
      const toInsert = []
      const toUpdate = []
      for (const item of content) {
        const existingContent = orderAlreadyExists.content.find((c) => c.upc === item.upc)
        if (existingContent) {
          if (existingContent.quantity !== item.quantity) {
            toUpdate.push({ id: existingContent.id, quantity: item.quantity })
          } else {
            identicalRows++
          }
        } else {
          toInsert.push({
            quantity: item.quantity,
            sku: item.sku,
            netValue: item.netValue,
            billingDocumentId: orderAlreadyExists.id,
            upc: item.upc,
          })
        }
      }
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map((u) => OrderContent.query().update({ quantity: u.quantity }).where('id', u.id)))
        updatedRows += toUpdate.length
      }
      if (toInsert.length > 0) {
        await OrderContent.query().insert(toInsert)
        createdRows += toInsert.length
      }
      if (toUpdate.length > 0 || toInsert.length > 0) ordersUpdated++
    } else {
      const newOrder = await Order.query().insert({ customerId: customer.id, orderDate })
      ordersCreated++
      const toInsert = content.map((item) => ({
        quantity: item.quantity,
        sku: item.sku,
        netValue: item.netValue,
        billingDocumentId: newOrder.id,
        upc: item.upc,
      }))
      await OrderContent.query().insert(toInsert)
      createdRows += toInsert.length
    }
  }

  return {
    result: { ordersCreated, ordersUpdated, ordersDeleted: 0 },
    rows: {
      createdRows,
      updatedRows,
      deletedRows: 0,
      identicalRows,
      rejected,
      received: data.length,
      invalidCustomers,
    },
  }
}

export async function createCircleKData({ fileName, fileContent, s3FileName }) {
  const { data, totalRowsReceived } = await parseCircleKSellOut({
    stream: fileContent,
  })

  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [],
      received: totalRowsReceived,
    },
    reportIds: [],
  }

  if (totalRowsReceived === 0) {
    throw new FileLevelError('No data found in Circle K file.')
  }

  const products = await CustomerUpc.query()
    .select()
    .where('banner', BANNERS.CIRCLE_K.search)
    .withGraphFetched('format.skus')

  // Process each week separately
  for (const { date, sales } of data) {
    const periodStart = moment.utc(date).startOf('isoWeek')
    const periodEnd = moment.utc(date).endOf('isoWeek')

    // Create or find DataImport for this week
    const dataImport =
      (await DataImport.query()
        .where('period_start', periodStart.format('YYYY-MM-DD'))
        .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
        .andWhere('file_origin', BANNERS.CIRCLE_K.global)
        .first()) ||
      (await DataImport.query().insert({
        periodStart: periodStart.format('YYYY-MM-DD'),
        periodEnd: periodEnd.format('YYYY-MM-DD'),
        weeksIncluded: 1,
        rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
        fileOrigin: BANNERS.CIRCLE_K.global,
      }))

    const { result, rows } = await saveCircleKData({
      data: sales,
      periodStart,
      periodEnd,
      dataImport,
      products,
    })

    // Accumulate results across all weeks
    uploadResult.reportIds.push(dataImport.id)
    uploadResult.result.ordersCreated += result.ordersCreated
    uploadResult.result.ordersUpdated += result.ordersUpdated
    uploadResult.result.ordersDeleted += result.ordersDeleted
    uploadResult.rows.createdRows += rows.createdRows
    uploadResult.rows.updatedRows += rows.updatedRows
    uploadResult.rows.deletedRows += rows.deletedRows
    uploadResult.rows.identicalRows += rows.identicalRows
    uploadResult.rows.rejected = [...uploadResult.rows.rejected, ...rows.rejected]
  }

  return uploadResult
}

export async function saveCircleKData({ data, periodStart, periodEnd, dataImport, products }) {
  const customers = await Customer.query().select().whereIn('banner', Object.values(BANNERS.CIRCLE_K))

  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0

  const rejected = []

  const competitorSales = await CompetitorSale.query().select('*').where('file_import', dataImport.id)

  const orders = await Order.query()
    .select()
    .whereIn('customers.banner', Object.values(BANNERS.CIRCLE_K))
    .where('orders.order_date', '>=', moment(periodStart).format('YYYY-MM-DD'))
    .where('orders.order_date', '<=', moment(periodEnd).format('YYYY-MM-DD'))
    .withGraphFetched('content')

  // Now create/update competitor sales for each store with aggregated values
  for (const { id: storeId, lines, ryde, rom } of data) {
    const customer = customers.find((c) => c.bannerInternalId === storeId)

    if (!customer) {
      rejected.push(ERRORS.invalidSiteNumber(`[${lines.join(', ')}]`, storeId))
      continue
    }

    const { byUpc } = ryde
    const content = []
    for (const [upc, { units, sales }] of Object.entries(byUpc)) {
      const linkedProduct = products.find((p) => p.customerUpc === upc)
      if (!linkedProduct) {
        rejected.push(ERRORS.invalidUPC(`[${lines.join(', ')}]`, upc))
        continue
      }

      const activeSku = linkedProduct.format.skus[0].sku
      content.push({ sku: activeSku, quantity: units, netValue: sales, upc })
    }

    // Skip order creation/update if content is empty
    if (content.length > 0) {
      const orderAlreadyExists = orders.find((o) => String(o.customerId) === String(customer.id))

      if (orderAlreadyExists) {
        for (const skuContent of orderAlreadyExists.content) {
          const currentContent = content.find((c) => c.upc === skuContent.upc)
          if (
            currentContent &&
            (skuContent.quantity !== currentContent.quantity || currentContent.netValue !== skuContent.netValue)
          ) {
            await OrderContent.query()
              .update({
                quantity: currentContent.quantity,
                netValue: currentContent.netValue,
              })
              .where('id', skuContent.id)
            updatedRows++
          } else if (currentContent) {
            identicalRows++
          }
        }
      } else {
        const newOrder = await Order.query().insert({
          customerId: customer.id,
          orderDate: moment(periodStart).format('YYYY-MM-DD'),
        })
        for (const { sku, quantity, netValue, upc } of content) {
          await OrderContent.query().insert({ sku, quantity, netValue, upc, billingDocumentId: newOrder.id })
          createdRows++
        }
      }
    }

    const competitorSalesExists = competitorSales.find((cs) => Number(cs.customerId) === Number(customer.id))

    const competitorData = {
      customerId: Number(customer.id),
      rydeUnits: ryde.units,
      rydeValue: round(ryde.sales, 2),
      romUnits: rom.units,
      romValue: round(rom.sales, 2),
      fileImport: dataImport.id,
    }

    if (competitorSalesExists) {
      // Check if values are different
      if (
        competitorSalesExists.rydeUnits !== competitorData.rydeUnits ||
        competitorSalesExists.rydeValue !== competitorData.rydeValue ||
        competitorSalesExists.romUnits !== competitorData.romUnits ||
        competitorSalesExists.romValue !== competitorData.romValue
      ) {
        await CompetitorSale.query().update(competitorData).where('id', competitorSalesExists.id)
        updatedRows++
      } else {
        identicalRows++
      }
    } else {
      await CompetitorSale.query().insert(competitorData)
      createdRows++
    }
  }

  return {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: { createdRows, updatedRows, deletedRows: 0, identicalRows, rejected, received: data.length },
  }
}

async function createCentralMarketOrder({ customerId, content, orderDate }) {
  // Only create order if content is not empty
  if (Object.keys(content).length === 0) {
    return { createdOrder: null, createdRows: 0 }
  }

  const newOrder = await Order.query().insert({
    customerId,
    orderDate,
  })

  let createdRows = 0
  for (const [sku, { quantity, netValue }] of Object.entries(content)) {
    await OrderContent.query().insert({
      quantity,
      sku,
      netValue,
      billingDocumentId: newOrder.id,
    })
    createdRows++
  }
  return { createdOrder: newOrder.id, createdRows }
}

export async function saveCentralMarketData({ data, periodStart, periodEnd, dataImport }) {
  const availableProducts = await ProductSku.query().select().withGraphFetched('format')

  const customers = await Customer.query().select().where('banner', BANNERS.CENTRAL_MARKET)
  const customerIds = customers.map((c) => c.id)
  const existingOrders = await Order.query()
    .withGraphFetched('content')
    .whereIn('customer_id', customerIds)
    .andWhere('order_date', moment(periodStart).format('YYYY-MM-DD'))

  const ordersCreated = []
  const ordersUpdated = []
  const ordersDeleted = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0

  const rejected = []
  const customerOrders = data.reduce((acc, { row, id, quantity, netValue, sku }) => {
    const linkedCustomer = customers.find((customer) => Number(customer.bannerInternalId) === Number(id))

    if (!linkedCustomer) {
      rejected.push(ERRORS.invalidSiteNumber(row, id))
      return acc
    }

    if (Number(quantity) === 0) {
      rejected.push(ERRORS.invalidQuantity(row, quantity))
      return acc
    }

    const linkedProduct = availableProducts.find((product) => product.sku === sku)

    if (!linkedProduct) {
      rejected.push(ERRORS.invalidSKU(row, sku))
      return acc
    }

    const skuAlreadyExist = acc[linkedCustomer.id]?.[linkedProduct]

    const newQty = skuAlreadyExist
      ? { quantity: skuAlreadyExist.quantity + Number(quantity), netValue: skuAlreadyExist.netValue + Number(netValue) }
      : { quantity: Number(quantity), netValue: Number(netValue) }

    return {
      ...acc,
      [linkedCustomer.id]: {
        ...acc[linkedCustomer.id],
        [linkedProduct.sku]: newQty,
      },
    }
  }, {})

  const existingOrdersByCustomer = groupBy(existingOrders, 'customerId')
  const ordersToDelete = existingOrders.reduce((acc, it) => {
    return { ...acc, [it.customerId]: { id: it.id, content: it.content.map((i) => i.id) } }
  }, {})

  for (const [customerId, content] of Object.entries(customerOrders)) {
    const orderAlreadyExists = existingOrdersByCustomer[customerId] ? first(existingOrdersByCustomer[customerId]) : null
    if (orderAlreadyExists) {
      for (const [sku, { quantity, netValue }] of Object.entries(content)) {
        const skuAlreadyExist = orderAlreadyExists.content.find((c) => c.sku === sku)
        if (skuAlreadyExist) {
          if (skuAlreadyExist.quantity !== quantity || skuAlreadyExist.netValue !== netValue) {
            await OrderContent.query().update({ quantity, netValue }).where('id', skuAlreadyExist.id)
            updatedRows++
            ordersUpdated.push(orderAlreadyExists.id)
          } else {
            identicalRows++
          }
          ordersToDelete[customerId].content = ordersToDelete[customerId].content.filter(
            (c) => c !== skuAlreadyExist.id,
          )
          if (!ordersToDelete[customerId].content.length) delete ordersToDelete[customerId]
        } else {
          await OrderContent.query().insert({ sku, quantity, netValue, billing_document_id: orderAlreadyExists.id })
          createdRows++
          ordersUpdated.push(orderAlreadyExists.id)
        }
      }
    } else {
      const res = await createCentralMarketOrder({
        customerId,
        content,
        orderDate: moment(periodStart).format('YYYY-MM-DD'),
      })

      createdRows += res.createdRows
      if (res.createdOrder) {
        ordersCreated.push(res.createdOrder)
      }
    }
  }

  for (const order of Object.values(ordersToDelete)) {
    await OrderContent.query().delete().whereIn('id', order.content)
    deletedRows += order.content.length

    const orderHasContent = await OrderContent.query().select().where('billing_document_id', order.id)
    if (orderHasContent) {
      ordersUpdated.push(order.id)
    } else {
      await Order.query().delete().where('id', order.id)
      ordersDeleted.push(order.id)
    }
  }

  const { rows: customerMonthlySales } = await Order.knex().raw(`
    SELECT
      customer_id as "customerId",
      sum(quantity) as quantity,
      sum(net_value) as "netValue"
    from orders
    join orders_content on orders.id = orders_content.billing_document_id
    where order_date = '${moment(periodStart).format('YYYY-MM-DD')}'
    group by customer_id
    `)

  for (const customerSale of customerMonthlySales) {
    const competitorSalesExists = await CompetitorSale.query()
      .select('*')
      .where('customer_id', customerSale.customerId)
      .andWhere('file_import', dataImport.id)
      .first()

    if (competitorSalesExists) {
      if (
        competitorSalesExists.rydeUnits !== Number(customerSale.quantity) ||
        competitorSalesExists.rydeValue !== Number(customerSale.netValue)
      ) {
        await CompetitorSale.query()
          .update({ rydeUnits: customerSale.quantity, rydeValue: customerSale.netValue })
          .where('id', competitorSalesExists.id)
      }
    } else {
      await CompetitorSale.query().insert({
        customerId: customerSale.customerId,
        rydeUnits: customerSale.quantity,
        rydeValue: customerSale.netValue,
        romUnits: 0,
        romValue: 0,
        fileImport: dataImport.id,
      })
    }
  }

  return {
    result: {
      ordersCreated: uniq(ordersCreated).length,
      ordersUpdated: uniq(ordersUpdated).length,
      ordersDeleted: uniq(ordersDeleted).length,
    },
    rows: { createdRows, updatedRows, deletedRows, identicalRows, rejected, received: data.length },
  }
}

export async function saveCentralMarketCompetitors({ periodStart, periodEnd, customersInFile, dataImports, file }) {
  const query = `
    WITH customers_to_generate AS (
      SELECT
        id
      from customers
      where id in (${customersInFile.join()})
    ),
    dates_to_use AS (
      SELECT
        monday AS start_date,
        monday + INTERVAL '6 days' AS end_date
      FROM generate_series(
        (
          CASE
            WHEN EXTRACT(DOW FROM '${periodStart}'::date) = 1 THEN '${periodStart}'::date
            ELSE '${periodStart}'::date + ((8 - EXTRACT(DOW FROM '${periodStart}'::date)::int) % 7) * INTERVAL '1 day'
          END
        ),
        '${periodEnd}'::date,
        INTERVAL '7 days'
      ) AS monday(monday)
    ),
    customer_weeks as (
      SELECT
        *
      FROM customers_to_generate
      CROSS JOIN dates_to_use
    ),
    customer_weekly_sales AS (
      SELECT
        customer_id,
        date_trunc('week', order_date) as order_week,
        sum(quantity * numerator) as ryde_quantity,
        sum(net_value) as ryde_value
      FROM orders
      JOIN orders_content on orders.id = orders_content.billing_document_id
      JOIN product_skus on product_skus.sku = orders_content.sku
      join product_formats on product_skus.format_id = product_formats.id
      WHERE customer_id in (SELECT * from customers_to_generate)
      AND order_date >= '${periodStart}' and order_date < '${periodEnd}'
      group by customer_id, order_week
    )
    SELECT 
      customer_weeks.id as customer_id,
      customer_weeks.start_date as week,
      coalesce(customer_weekly_sales.ryde_quantity, 0) as ryde_units,
      coalesce(customer_weekly_sales.ryde_value, 0) as ryde_value,
      0 as rom_units,
      0 as rom_value
    FROM customer_weeks
    left join customer_weekly_sales on customer_weekly_sales.customer_id = customer_weeks.id and 
          customer_weekly_sales.order_week = customer_weeks.start_date
    `

  const { rows: customerWeeklySales } = await CustomerUpc.knex().raw(query)
  const weeklySales = groupBy(customerWeeklySales, (item) => moment(item.week).format('YYYY-MM-DD'))
  const reports = []
  const { name, reportStart, uploadResult } = file
  for (const dataImport of dataImports) {
    const currentWeekSales = weeklySales[moment(dataImport.periodStart).format('YYYY-MM-DD')]

    for (const customerSales of currentWeekSales) {
      const customerCompetitorDataAlreadyExists = dataImport.competitorSales.find(
        (cs) => cs.customerId === customerSales.customer_id,
      )

      const competitorSalesValue = {
        ...omit(customerSales, 'week'),
        file_import: dataImport.id,
      }

      if (customerCompetitorDataAlreadyExists) {
        if (
          customerCompetitorDataAlreadyExists.rydeUnits !== Number(customerSales.ryde_units) ||
          customerCompetitorDataAlreadyExists.rydeValue !== Number(customerSales.ryde_value)
        ) {
          await CompetitorSale.query().patch(competitorSalesValue).findById(customerCompetitorDataAlreadyExists.id)
        }
      } else {
        await CompetitorSale.query().insert(competitorSalesValue)
      }
    }

    const sellOutReport = await Report.query().insert({
      type: REPORTS.centralMarket,
      reportStart: reportStart.format(),
      reportEnd: moment().format(),
      fileName: name,
      created: uploadResult.rows.createdRows,
      updated: uploadResult.rows.updatedRows,
      deleted: uploadResult.rows.deletedRows,
      dataImportId: dataImport.id,
    })
    reports.push(sellOutReport)
  }
}

export async function saveLoblawsData({ data, periodStart, dataImport }) {
  const availableProducts = await CustomerUpc.query()
    .select()
    .where('banner', BANNERS.LOBLAWS)
    .withGraphFetched('format.skus')

  const soldInSkus = await ReplenOrder.query()
    .distinct('sku')
    .join('replen_orders_content', 'replen_orders_content.billing_document_id', 'replen_orders.billing_document_id')
    .join('customers', 'customers.id', 'replen_orders.customer_id')
    .where('banner', BANNERS.LOBLAWS)

  const upcSku = availableProducts.map((s) => {
    if (s.format.skus.length === 1)
      return { sku: s.format.skus[0].sku, upc: s.customerUpc, packSize: s.format.numerator }
    const soldInSku = s.format.skus.find((formSku) => soldInSkus.find((curSku) => curSku.sku === formSku.sku))
    if (soldInSku) {
      return { sku: soldInSku.sku, upc: s.customerUpc, packSize: s.format.numerator }
    }

    return { sku: s.format.skus[0].sku, upc: s.customerUpc, packSize: s.format.numerator }
  })

  const customers = await Customer.query().select().where('banner', BANNERS.LOBLAWS)

  const existingOrders = await Order.query()
    .withGraphFetched('content')
    .whereIn(
      'customer_id',
      customers.map((c) => c.id),
    )
    .andWhere('order_date', periodStart)

  const competitorData = await DataImport.query()
    .withGraphFetched('competitorSales')
    .where('period_start', periodStart)
    .andWhere('period_end', moment(periodStart).endOf('isoWeek'))
    .andWhere('file_origin', BANNERS.LOBLAWS)
    .first()

  let ordersCreated = 0
  let ordersUpdated = 0
  let ordersDeleted = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0

  const rejected = []

  const locationSales = groupBy(data, 'customerId')
  const customerSales = Object.entries(locationSales).reduce((acc, [locationId, orders]) => {
    const linkedCustomer = customers.find((customer) => Number(customer.bannerInternalId) === Number(locationId))

    if (!linkedCustomer) {
      rejected.push(
        ERRORS.invalidSiteNumber(
          orders.map((o) => o.row),
          locationId,
        ),
      )
      return acc
    }

    const quantitiesOrdered = orders.reduce((acc, it) => {
      if (Number(it.quantity) === 0) {
        rejected.push(ERRORS.invalidQuantity(it.row, it.quantity))
        return acc
      }

      if (Number(it.netValue) === 0) {
        rejected.push(ERRORS.custom(it.row, `Invalid quantity: ${it.netValue}. Must be greater than 0.`))
        return acc
      }

      const upcIsValid = upcSku.find((us) => us.upc === it.productUpc)

      if (!upcIsValid) {
        rejected.push(ERRORS.invalidUPC(it.row, it.productUpc))
        return acc
      }

      return [
        ...acc,
        {
          sku: upcIsValid.sku,
          quantity: it.quantity,
          netValue: it.netValue,
          upc: it.productUpc,
          packSize: upcIsValid.packSize,
        },
      ]
    }, [])

    return { ...acc, [linkedCustomer.id]: quantitiesOrdered }
  }, {})

  let ordersToDelete = existingOrders

  for (const [erp, orders] of Object.entries(customerSales)) {
    if (!erp) continue
    const orderAlreadyExists = existingOrders.find(
      (o) => o.customerId === erp && moment(o.orderDate).format('YYYY-MM-DD') === periodStart,
    )

    if (orderAlreadyExists) {
      let orderIsUpdated = false

      for (const quantity of orders) {
        const assignedContent = orderAlreadyExists.content.find((o) => o.sku === quantity.sku)

        const totalUnits = Number(quantity.quantity) * quantity.packSize
        if (assignedContent) {
          if (
            (assignedContent.upc === quantity.upc && assignedContent.quantity !== totalUnits) ||
            assignedContent.netValue !== Number(quantity.netValue)
          ) {
            await OrderContent.query()
              .update({ quantity: totalUnits, netValue: quantity.netValue })
              .where('id', assignedContent.id)
            updatedRows++
            orderIsUpdated = true
          } else {
            // Row is identical
            identicalRows++
          }
        } else {
          await OrderContent.query().insert({
            quantity: totalUnits,
            sku: quantity.sku,
            netValue: quantity.netValue,
            billingDocumentId: orderAlreadyExists.id,
            // upc: quantity.upc,
          })
          createdRows++
          orderIsUpdated = true
        }
      }
      if (orderIsUpdated) ordersUpdated++

      const skusToKeep = orders.map((q) => q.sku)
      const contentToDelete = orderAlreadyExists.content.filter((c) => !skusToKeep.includes(c.sku))

      if (contentToDelete.length) {
        await OrderContent.query()
          .delete()
          .whereIn(
            'id',
            contentToDelete.map((ctd) => ctd.id),
          )
        deletedRows++
      }

      ordersToDelete = ordersToDelete.filter((otd) => otd.id !== orderAlreadyExists.id)
    } else {
      // Only create order if orders array is not empty
      if (orders.length > 0) {
        const newOrder = await Order.query().insert({ customerId: erp, orderDate: periodStart })
        ordersCreated++
        for (const order of orders) {
          await OrderContent.query().insert({
            quantity: Number(order.quantity) * order.packSize,
            sku: order.sku,
            netValue: order.netValue,
            billingDocumentId: newOrder.id,
            upc: order.upc,
          })
          createdRows++
        }
      }
    }

    if (dataImport) {
      const currentErpCompData = {
        rydeUnits: sumBy(orders, (unit) => unit.quantity * unit.packSize),
        rydeValue: round(sumBy(orders, 'netValue'), 2),
        romUnits: 0,
        romValue: 0,
        customerId: erp,
        fileImport: dataImport,
      }

      const linkedData = competitorData?.competitorSales.find((cd) => cd.customerId === erp)

      if (linkedData) {
        await CompetitorSale.query().patch(currentErpCompData).findById(linkedData.id)
      } else {
        await CompetitorSale.query().insert(currentErpCompData)
      }
    }
  }

  if (ordersToDelete.length) {
    for (const order of ordersToDelete) {
      await OrderContent.query()
        .delete()
        .whereIn(
          'id',
          order.content.map((c) => c.id),
        )
      deletedRows += order.content.length
      await Order.query().delete().where('id', order.id)
      ordersDeleted++
    }
  }

  return {
    result: { ordersCreated, ordersUpdated, ordersDeleted },
    rows: { createdRows, updatedRows, deletedRows, identicalRows, rejected, received: data.length },
  }
}
export async function saveSelloutCircleKData({ data, periodStart, periodEnd }) {
  const locationSales = groupBy(data, 'siteNumber')

  const formats = await ProductFormat.query()
    .select()
    .whereIn('upc', uniq(data.map((row) => row.upc)))
    .withGraphFetched('product.skus')

  const customers = await Customer.query().select().whereIn('banner', Object.values(BANNERS.CIRCLE_K))
  const existingOrders = await Order.query()
    .withGraphFetched('content')
    .where('order_date', '>=', periodStart.format())
    .andWhere('order_date', '<=', periodEnd.format())

  let ordersCreated = 0
  let ordersUpdated = 0
  let ordersDeleted = 0
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0

  const rejected = []

  const byDate = Object.entries(locationSales).reduce((acc, [locationId, orders]) => {
    const linkedCustomer = customers.find((customer) => Number(customer.bannerInternalId) === Number(locationId))

    if (!linkedCustomer) {
      rejected.push(ERRORS.invalidSiteNumber(orders.map((o) => o.row).join('-sellout, '), locationId))
      return acc
    }
    const orderByDate = groupBy(orders, 'date')
    const quantitiesOrdered = Object.entries(orderByDate).map(([date, orders]) => {
      const qtyRows = orders.map((o) => {
        const linkedFormat = formats.find((format) => format.upc === o.upc)

        if (!linkedFormat) {
          rejected.push(ERRORS.invalidUPC(o.row, locationId))
          return acc
        }

        if (linkedFormat.product.skus.length !== 1) {
          rejected.push(
            ERRORS.custom(o.row, `Was not able to find the specific SKU. Please contact Volume 7 to validate.`),
          )
          return acc
        }

        return {
          sku: first(linkedFormat.product.skus).sku,
          quantity: o.singleUnitsSold,
          netValue: o.sales,
          upc: o.upc,
        }
      })
      return { date, quantities: qtyRows }
    })

    return { ...acc, [linkedCustomer.id]: quantitiesOrdered }
  }, {})

  let ordersToDelete = existingOrders
  for (const [erp, orders] of Object.entries(byDate)) {
    for (const order of orders) {
      if (order.date === 'Grand Total' || !erp || !order.date) continue

      const orderAlreadyExists = existingOrders.find(
        (o) => o.customerId === Number(erp) && moment(o.orderDate).format('YYYY-MM-DD') === order.date,
      )

      if (orderAlreadyExists) {
        let orderIsUpdated = false
        for (const quantity of order.quantities) {
          const assignedContent = orderAlreadyExists.content.find((o) => o.sku === quantity.sku)
          if (assignedContent) {
            if (
              assignedContent.upc === quantity.upc &&
              (assignedContent.quantity !== Number(quantity.quantity) ||
                assignedContent.netValue !== Number(quantity.netValue))
            ) {
              await OrderContent.query()
                .update({ quantity: quantity.quantity, netValue: quantity.netValue })
                .where('id', assignedContent.id)
              updatedRows++
              orderIsUpdated = true
            } else {
              // Row is identical
              identicalRows++
            }
          } else {
            await OrderContent.query().insert({
              quantity: quantity.quantity,
              sku: quantity.sku,
              netValue: quantity.netValue,
              billingDocumentId: orderAlreadyExists.id,
              upc: quantity.upc,
            })
            createdRows++
            orderIsUpdated = true
          }
        }
        if (orderIsUpdated) ordersUpdated++

        const skusToKeep = order.quantities.map((q) => q.sku)
        const contentToDelete = orderAlreadyExists.content.filter((c) => !skusToKeep.includes(c.sku))

        if (contentToDelete.length) {
          await OrderContent.query()
            .delete()
            .whereIn(
              'id',
              contentToDelete.map((ctd) => ctd.id),
            )
          deletedRows++
        }

        ordersToDelete = ordersToDelete.filter((otd) => otd.id !== orderAlreadyExists.id)
      } else {
        // Only create order if quantities array is not empty
        if (order.quantities && order.quantities.length > 0) {
          const newOrder = await Order.query().insert({ customerId: erp, orderDate: order.date })
          ordersCreated++
          for (const quantity of order.quantities) {
            await OrderContent.query().insert({
              quantity: quantity.quantity,
              sku: quantity.sku,
              netValue: quantity.netValue,
              billingDocumentId: newOrder.id,
              upc: quantity.upc,
            })
            createdRows++
          }
        }
      }
    }
  }

  if (ordersToDelete.length) {
    for (const order of ordersToDelete) {
      const linkedCustomer = customers.find((c) => c.id === order.customerId)
      if (!Object.values(BANNERS.CIRCLE_K).includes(linkedCustomer.banner)) continue
      await OrderContent.query()
        .delete()
        .whereIn(
          'id',
          order.content.map((c) => c.id),
        )
      deletedRows += order.content.length
      await Order.query().delete().where('id', order.id)
      ordersDeleted++
    }
  }

  return {
    result: { ordersCreated, ordersUpdated, ordersDeleted },
    rows: { createdRows, updatedRows, deletedRows, identicalRows, rejected, received: data.length },
  }
}

export async function saveCompetitorsSalesCircleKData({ data, periodStart, periodEnd }) {
  const customers = await Customer.query().select().whereIn('banner', Object.values(BANNERS.CIRCLE_K))

  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0
  let deletedRows = 0
  const rejectedRows = []

  const competitorData = await DataImport.query()
    .withGraphFetched('competitorSales')
    .where('period_start', periodStart.format('YYYY-MM-DD'))
    .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
    .andWhere('file_origin', BANNERS.CIRCLE_K.global)
    .first()

  let rowsToDelete = competitorData?.competitorSales ?? []

  for (const dataRow of data) {
    const { row, address, city, siteNumber, rydeUnits, rydeSales, promoUnits, competitorsUnits, competitorsSales } =
      dataRow

    const activeCustomer = customers.find((customer) => Number(customer.bannerInternalId) === Number(siteNumber))

    if (!activeCustomer) {
      rejectedRows.push(ERRORS.invalidSiteNumber(row.concat(' (competitor_sales)'), siteNumber))
      continue
    }

    const customerAddress = { address, city }

    if (!isEqual(activeCustomer.address, customerAddress)) {
      await Customer.query().update({ address: customerAddress }).where({ id: activeCustomer.id })
    }

    const data = {
      rydeUnits: Number(rydeUnits) === 0 ? 0 : Number(rydeUnits),
      rydeValue: Number(rydeUnits) === 0 ? 0 : round(parseFloat(rydeSales), 2),
      romUnits: Number(competitorsUnits) === 0 ? 0 : Number(competitorsUnits),
      romValue: Number(competitorsUnits) === 0 ? 0 : round(parseFloat(competitorsSales), 2),
      promoUnits: Number(promoUnits) === 0 ? 0 : Number(promoUnits),
      customerId: activeCustomer.id,
      fileImport: competitorData?.id,
    }

    const linkedData = competitorData?.competitorSales.find((cd) => cd.customerId === activeCustomer.id)
    if (linkedData) {
      if (
        linkedData.rydeUnits !== Number(data.rydeUnits) ||
        linkedData.rydeValue !== Number(data.rydeValue) ||
        linkedData.romUnits !== Number(data.romUnits) ||
        linkedData.romValue !== Number(data.romValue) ||
        linkedData.promoUnits !== Number(data.promoUnits)
      ) {
        await CompetitorSale.query().patch(data).findById(linkedData.id)
        updatedRows++
      } else {
        identicalRows++
      }
      rowsToDelete = rowsToDelete.filter((row) => row.id !== linkedData.id)
    } else {
      await CompetitorSale.query().insert(data)
      createdRows++
    }
  }

  if (rowsToDelete.length) {
    await CompetitorSale.query()
      .delete()
      .whereIn(
        'id',
        rowsToDelete.map((rtd) => rtd.id),
      )
    deletedRows += rowsToDelete.length
  }

  await refreshCustomerVelocity()

  return { rows: { createdRows, updatedRows, deletedRows, identicalRows, rejectedRows, received: data.length } }
}

export async function updateRabbaReport({ fileName, reportId, res }) {
  const { rejected, createdRows, updatedRows, deletedRows, dataImportId } = res

  await Report.query()
    .update({
      fileName,
      reportEnd: moment().format(),
      warnings: { rejected },
      created: createdRows,
      updated: updatedRows,
      deleted: deletedRows,
      dataImportId,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function updateCentralMarketReport({ fileName, reportId, rows, dataImportId }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejectedRows },
      dataImportId,
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function updateLoblawsReport({ fileName, reportId, rows, dataImportId }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejectedRows },
      dataImportId,
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function updateCircleKReport({ fileName, reportId, rows, dataImportId }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejectedRows },
      dataImportId,
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function createParklandData({ fileName, fileContent, s3FileName }) {
  const { data: dateData, totalRowsReceived } = await parseParklandSellOut({
    stream: fileContent,
  })

  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [],
      received: totalRowsReceived,
    },
    reportIds: [],
  }

  if (!dateData || dateData.length === 0) {
    throw new FileLevelError('No data found in Parkland file.')
  }

  const query = `
      SELECT
        distinct replen_orders_content.sku, numerator
      from replen_orders
      join replen_orders_content on replen_orders_content.billing_document_id = replen_orders.billing_document_id
      join customers on customers.id = replen_orders.customer_id
      join product_skus on product_skus.sku = replen_orders_content.sku
      join product_formats on product_formats.id = product_skus.format_id
      where banner = '${BANNERS.PARKLAND}'
      order by replen_orders_content.sku asc
    `
  const { rows: soldInSkus } = await CustomerUpc.knex().raw(query)
  const availableSkus = soldInSkus.map((entry) => entry.sku)

  // Process each date separately
  for (const { date, sales } of dateData) {
    const periodStart = moment.utc(date).startOf('isoWeek')
    const periodEnd = moment.utc(date).endOf('isoWeek')

    // Create or find DataImport for this week
    const dataImport =
      (await DataImport.query()
        .where('period_start', periodStart.format('YYYY-MM-DD'))
        .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
        .andWhere('file_origin', BANNERS.PARKLAND)
        .first()) ||
      (await DataImport.query().insert({
        periodStart: periodStart.format('YYYY-MM-DD'),
        periodEnd: periodEnd.format('YYYY-MM-DD'),
        weeksIncluded: 1,
        rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
        fileOrigin: BANNERS.PARKLAND,
      }))

    const { result, rows } = await saveParklandData({
      data: sales,
      periodStart,
      periodEnd,
      dataImport,
      salesDate: date,
      availableSkus,
    })

    // Accumulate results across all weeks
    uploadResult.reportIds.push(dataImport.id)
    uploadResult.result.ordersCreated += result.ordersCreated
    uploadResult.result.ordersUpdated += result.ordersUpdated
    uploadResult.result.ordersDeleted += result.ordersDeleted
    uploadResult.rows.createdRows += rows.createdRows
    uploadResult.rows.updatedRows += rows.updatedRows
    uploadResult.rows.deletedRows += rows.deletedRows
    uploadResult.rows.identicalRows += rows.identicalRows
    uploadResult.rows.rejected = [...uploadResult.rows.rejected, ...rows.rejected]
  }

  uploadResult.rows.rejected = uniq(uploadResult.rows.rejected)

  return uploadResult
}

export async function saveParklandData({ data, periodStart, periodEnd, dataImport, salesDate }) {
  const singleUnitSkus = ['100131', '100133', '100134']
  const customers = await Customer.query().select().where('banner', BANNERS.PARKLAND)

  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0
  let ordersCreated = 0
  let ordersUpdated = 0

  const rejected = []

  const existingCompetitorSales = await CompetitorSale.query().select('*').where('file_import', dataImport.id)
  const existingCompetitorOrders = await CompetitorOrder.query().select('*').where('order_date', salesDate)

  const customerIds = customers.map((c) => c.id)
  const existingOrders = await Order.query()
    .withGraphFetched('content')
    .whereIn('customer_id', customerIds)
    .andWhere('order_date', moment(salesDate).format('YYYY-MM-DD'))

  // Now create/update competitor sales for each store with aggregated values
  for (const { id: storeId, lines, ryde, rom } of data) {
    const customer = customers.find((c) => c.bannerInternalId === storeId)

    if (!customer) {
      rejected.push(ERRORS.invalidSiteNumber(`[${lines.join(', ')}]`, storeId))
      continue
    }

    const orderAlreadyExists = existingOrders.find((order) => Number(order.customerId) === Number(customer.id))

    // Calculate unit distribution across SKUs
    const totalUnits = ryde.units
    const totalValue = ryde.sales
    const skus = singleUnitSkus

    // Distribute units evenly: each SKU gets baseUnits, then remainder goes to first N SKUs
    const baseUnits = Math.floor(totalUnits / skus.length)
    const remainder = totalUnits % skus.length

    // Early exit if no units to distribute
    const content = skus.reduce((acc, sku, index) => {
      const quantity = baseUnits + (index < remainder ? 1 : 0)
      if (quantity === 0) return acc
      const netValue = round((quantity / totalUnits) * totalValue, 2)
      return [
        ...acc,
        {
          sku,
          quantity,
          netValue,
        },
      ]
    }, [])

    if (orderAlreadyExists) {
      // Update existing order
      let hasChanges = false
      for (const { sku, quantity, netValue, upc } of content) {
        const existingContent = orderAlreadyExists.content.find((c) => c.sku === sku)
        if (existingContent) {
          if (existingContent.quantity !== quantity || existingContent.netValue !== netValue) {
            await OrderContent.query().update({ quantity, netValue }).where('id', existingContent.id)
            updatedRows++
            hasChanges = true
          } else {
            identicalRows++
          }
        } else {
          await OrderContent.query().insert({ sku, quantity, netValue, upc, billingDocumentId: orderAlreadyExists.id })
          createdRows++
          hasChanges = true
        }
      }
      // Remove SKUs that are no longer in content
      for (const existingContent of orderAlreadyExists.content) {
        if (!content.find((c) => c.sku === existingContent.sku)) {
          await OrderContent.query().deleteById(existingContent.id)
          deletedRows++
          hasChanges = true
        }
      }
      if (hasChanges) {
        ordersUpdated++
      }
    } else {
      if (content.length > 0) {
        const newOrder = await Order.query().insert({
          customerId: customer.id,
          orderDate: moment(salesDate).format('YYYY-MM-DD'),
        })
        for (const { sku, quantity, netValue, upc } of content) {
          await OrderContent.query().insert({ sku, quantity, netValue, upc, billingDocumentId: newOrder.id })
          createdRows++
        }
        ordersCreated++
      }
    }

    const customerCompetitorOrders = existingCompetitorOrders.filter(
      (comp) => Number(comp.customerId) === Number(customer.id),
    )

    // Process each brand in rom.salesByBrand
    for (const [brand, data] of Object.entries(rom.salesByBrand)) {
      const existingOrder = customerCompetitorOrders.find((order) => order.brand === brand)

      if (existingOrder) {
        // Validate and update if the amount is different
        if (existingOrder.quantity !== data.units || existingOrder.value !== data.sales) {
          await CompetitorOrder.query()
            .update({
              quantity: data.units,
              value: round(data.sales, 2),
            })
            .where('id', existingOrder.id)
          updatedRows++
        } else {
          identicalRows++
        }
      } else {
        // Create a new Competitor Order if brand is in rom.salesByBrand but not in customerCompetitorOrders
        await CompetitorOrder.query().insert({
          customerId: customer.id,
          brand,
          quantity: data.units,
          value: round(data.sales, 2),
          orderDate: moment(salesDate).format('YYYY-MM-DD'),
        })
        createdRows++
      }
    }

    // Delete orders for brands that are no longer in rom.salesByBrand
    for (const existingOrder of customerCompetitorOrders) {
      if (!rom.salesByBrand[existingOrder.brand]) {
        await CompetitorOrder.query().deleteById(existingOrder.id)
        deletedRows++
      }
    }

    const competitorSalesExists = existingCompetitorSales.find((c) => Number(c.customerId) === Number(customer.id))

    const competitorData = {
      customerId: Number(customer.id),
      rydeUnits: ryde.units,
      rydeValue: round(ryde.sales, 2),
      romUnits: rom.units,
      romValue: round(rom.sales, 2),
      fileImport: dataImport.id,
    }

    if (competitorSalesExists) {
      // Check if values are different
      if (
        competitorSalesExists.rydeUnits !== competitorData.rydeUnits ||
        competitorSalesExists.rydeValue !== competitorData.rydeValue ||
        competitorSalesExists.romUnits !== competitorData.romUnits ||
        competitorSalesExists.romValue !== competitorData.romValue
      ) {
        await CompetitorSale.query().update(competitorData).where('id', competitorSalesExists.id)
        updatedRows++
      } else {
        identicalRows++
      }
    } else {
      await CompetitorSale.query().insert(competitorData)
      createdRows++
    }
  }

  return {
    result: {
      ordersCreated,
      ordersUpdated,
      ordersDeleted: 0,
    },
    rows: { createdRows, updatedRows, deletedRows, identicalRows, rejected, received: data.length },
  }
}

export async function updateParklandReport({ fileName, reportId, rows }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejected },
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function createPetroCanadaData({ fileName, fileContent, s3FileName }) {
  const { data: dateData, totalRowsReceived } = await parsePetroCanadaSellOut({
    stream: fileContent,
  })

  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [],
      received: totalRowsReceived,
    },
    reportIds: [],
  }

  if (!dateData || dateData.length === 0) {
    throw new FileLevelError('No data found in Petro Canada file.')
  }

  const salesByWeek = groupBy(dateData, 'date')

  // Extract all dates and group them by week
  const allDates = Object.entries(salesByWeek)
  if (allDates.length === 0) {
    throw new FileLevelError('No sales dates found in Petro Canada file.')
  }

  const products = await CustomerUpc.query()
    .select()
    .where('banner', BANNERS.PETRO_CANADA)
    .withGraphFetched('format.skus')

  const dateMoments = Object.keys(salesByWeek).map((d) => moment(d))

  const q = `
    SELECT
      orders.id
    from orders
    left join orders_content on orders_content.billing_document_id = orders.id
    join customers on customers.id = orders.customer_id
    where banner = '${BANNERS.PETRO_CANADA}'
    and order_date between '${min(dateMoments).format('YYYY-MM-DD')}' and '${max(dateMoments).format('YYYY-MM-DD')}'
  `
  const { rows: orderIds } = await CustomerUpc.knex().raw(q)
  const orders = await Order.query()
    .select()
    .whereIn(
      'id',
      orderIds.map((id) => id.id),
    )
    .withGraphFetched('content')

  const customers = await Customer.query().select().where('banner', 'like', `%${BANNERS.PETRO_CANADA}%`)

  await Promise.map(
    Object.values(salesByWeek),
    async ([{ date, sales }]) => {
      const periodStart = moment.utc(date).startOf('isoWeek')
      const periodEnd = moment.utc(date).endOf('isoWeek')

      // Create or find DataImport for this week
      const dataImport =
        (await DataImport.query()
          .where('period_start', periodStart.format('YYYY-MM-DD'))
          .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
          .andWhere('file_origin', BANNERS.PETRO_CANADA)
          .first()) ||
        (await DataImport.query().insert({
          periodStart: periodStart.format('YYYY-MM-DD'),
          periodEnd: periodEnd.format('YYYY-MM-DD'),
          weeksIncluded: 1,
          rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
          fileOrigin: BANNERS.PETRO_CANADA,
        }))

      const { result, rows } = await savePetroCanadaData({
        data: sales,
        periodStart,
        periodEnd,
        dataImport,
        products,
        salesDate: date,
        orders: orders.filter((o) => moment(date).isSame(o.orderDate, 'day')),
        customers,
      })

      // Accumulate results across all weeks
      uploadResult.reportIds.push(dataImport.id)
      uploadResult.result.ordersCreated += result.ordersCreated
      uploadResult.result.ordersUpdated += result.ordersUpdated
      uploadResult.result.ordersDeleted += result.ordersDeleted
      uploadResult.rows.createdRows += rows.createdRows
      uploadResult.rows.updatedRows += rows.updatedRows
      uploadResult.rows.deletedRows += rows.deletedRows
      uploadResult.rows.identicalRows += rows.identicalRows
      uploadResult.rows.rejected = [...uploadResult.rows.rejected, ...rows.rejected]
    },
    { concurrency: 5 },
  )

  uploadResult.rows.rejected = uniq(uploadResult.rows.rejected)

  return uploadResult
}

export async function savePetroCanadaData({
  data,
  periodStart,
  periodEnd,
  dataImport,
  products,
  salesDate,
  orders,
  customers,
}) {
  let createdRows = 0
  let updatedRows = 0
  let deletedRows = 0
  let identicalRows = 0
  const ordersDeleted = 0

  const rejected = []
  const ordersInFile = []

  const competitorSales = await CompetitorSale.query().select('*').where('file_import', dataImport.id)
  const existingCompetitorOrders = await CompetitorOrder.query()
    .select('*')
    .where('order_date', salesDate)
    .whereIn(
      'customer_id',
      customers.map((c) => c.id),
    )

  // Prepare batch operations
  const orderContentsToUpdate = []
  const orderContentIdsToDelete = []
  const orderIdsToDelete = []
  const ordersToInsert = []
  const competitorOrdersToUpdate = []
  const competitorOrdersToInsert = []
  const competitorOrderIdsToDelete = []
  const competitorSalesToUpdate = []
  const competitorSalesToInsert = []

  // Build customer lookup map for faster access
  const customerMap = new Map(customers.map((c) => [c.bannerInternalId, c]))
  const productMap = new Map(products.map((p) => [p.customerUpc, p]))
  const ordersByCustomerId = new Map(orders.map((o) => [String(o.customerId), o]))
  const competitorSalesByCustomerId = new Map(competitorSales.map((cs) => [Number(cs.customerId), cs]))

  // Process all data and prepare batch operations
  for (const { id: storeId, lines, ryde, rom } of data) {
    const customer = customerMap.get(storeId)

    if (!customer) {
      rejected.push(ERRORS.invalidSiteNumber(`[${lines.join(', ')}]`, storeId))
      continue
    }

    const { byUpc } = ryde
    const content = []
    for (const [upc, { units, sales }] of Object.entries(byUpc)) {
      const linkedProduct = productMap.get(upc)
      if (!linkedProduct) {
        rejected.push(ERRORS.invalidUPC(`[${lines.join(', ')}]`, upc))
        continue
      }

      const activeSku = linkedProduct.format.skus[0].sku
      content.push({ sku: activeSku, quantity: units, netValue: sales, upc })
    }

    const orderAlreadyExists = ordersByCustomerId.get(String(customer.id))

    if (orderAlreadyExists) {
      if (content.length) {
        for (const skuContent of orderAlreadyExists.content) {
          const currentContent = content.find((c) => c.upc === skuContent.upc)
          if (
            currentContent &&
            (skuContent.quantity !== currentContent.quantity || currentContent.netValue !== skuContent.netValue)
          ) {
            orderContentsToUpdate.push({
              id: skuContent.id,
              quantity: currentContent.quantity,
              netValue: currentContent.netValue,
            })
          }
        }
      } else {
        orderContentIdsToDelete.push(orderAlreadyExists.id)
        orderIdsToDelete.push(orderAlreadyExists.id)
      }
    } else {
      // Only create order if content is not empty
      if (content.length > 0) {
        ordersToInsert.push({
          customerId: customer.id,
          orderDate: moment(periodStart).format('YYYY-MM-DD'),
          content,
        })
      }
    }

    const customerCompetitorOrders = existingCompetitorOrders.filter(
      (comp) => Number(comp.customerId) === Number(customer.id),
    )

    // Process each brand in rom.salesByBrand
    for (const [brand, brandData] of Object.entries(rom.salesByBrand)) {
      const existingOrder = customerCompetitorOrders.find((order) => order.brand === brand)

      if (existingOrder) {
        // Validate and update if the amount is different
        if (existingOrder.quantity !== brandData.units || existingOrder.value !== brandData.sales) {
          competitorOrdersToUpdate.push({
            id: existingOrder.id,
            quantity: brandData.units,
            value: round(brandData.sales, 2),
          })
          updatedRows++
        } else {
          identicalRows++
        }
      } else {
        // Create a new Competitor Order if brand is in rom.salesByBrand but not in customerCompetitorOrders
        competitorOrdersToInsert.push({
          customerId: customer.id,
          brand,
          quantity: brandData.units,
          value: round(brandData.sales, 2),
          orderDate: moment(salesDate).format('YYYY-MM-DD'),
        })
        createdRows++
      }
    }

    // Delete orders for brands that are no longer in rom.salesByBrand
    for (const existingOrder of customerCompetitorOrders) {
      if (!rom.salesByBrand[existingOrder.brand]) {
        competitorOrderIdsToDelete.push(existingOrder.id)
        deletedRows++
      }
    }

    const competitorSalesExists = competitorSalesByCustomerId.get(Number(customer.id))

    const competitorData = {
      customerId: Number(customer.id),
      rydeUnits: ryde.units,
      rydeValue: round(ryde.sales, 2),
      romUnits: rom.units,
      romValue: round(rom.sales, 2),
      fileImport: dataImport.id,
    }

    if (competitorSalesExists) {
      // Check if values are different
      if (
        competitorSalesExists.rydeUnits !== competitorData.rydeUnits ||
        competitorSalesExists.rydeValue !== competitorData.rydeValue ||
        competitorSalesExists.romUnits !== competitorData.romUnits ||
        competitorSalesExists.romValue !== competitorData.romValue
      ) {
        competitorSalesToUpdate.push({ id: competitorSalesExists.id, ...competitorData })
        updatedRows++
      } else {
        identicalRows++
      }
    } else {
      competitorSalesToInsert.push(competitorData)
      createdRows++
    }
  }

  // Execute all batch operations
  // Update OrderContents in bulk
  if (orderContentsToUpdate.length > 0) {
    const trx = await OrderContent.startTransaction()
    try {
      for (const update of orderContentsToUpdate) {
        await OrderContent.query(trx)
          .update({ quantity: update.quantity, netValue: update.netValue })
          .where('id', update.id)
      }
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  // Delete OrderContents and Orders
  if (orderContentIdsToDelete.length > 0) {
    await OrderContent.query().delete().whereIn('billing_document_id', orderContentIdsToDelete)
  }
  if (orderIdsToDelete.length > 0) {
    await Order.query().delete().whereIn('id', orderIdsToDelete)
  }

  // Insert new Orders and their content
  if (ordersToInsert.length > 0) {
    const trx = await Order.startTransaction()
    try {
      for (const orderData of ordersToInsert) {
        const { content, ...orderFields } = orderData
        const newOrder = await Order.query(trx).insert(orderFields)

        if (content.length > 0) {
          await OrderContent.query(trx).insert(
            content.map(({ sku, quantity, netValue, upc }) => ({
              sku,
              quantity,
              netValue,
              upc,
              billingDocumentId: newOrder.id,
            })),
          )
        }
      }
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  // Update CompetitorOrders in bulk
  if (competitorOrdersToUpdate.length > 0) {
    const trx = await CompetitorOrder.startTransaction()
    try {
      for (const update of competitorOrdersToUpdate) {
        await CompetitorOrder.query(trx)
          .update({ quantity: update.quantity, value: update.value })
          .where('id', update.id)
      }
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  // Insert CompetitorOrders in bulk
  if (competitorOrdersToInsert.length > 0) {
    await CompetitorOrder.query().insert(competitorOrdersToInsert)
  }

  // Delete CompetitorOrders in bulk
  if (competitorOrderIdsToDelete.length > 0) {
    await CompetitorOrder.query().delete().whereIn('id', competitorOrderIdsToDelete)
  }

  // Update CompetitorSales in bulk
  if (competitorSalesToUpdate.length > 0) {
    const trx = await CompetitorSale.startTransaction()
    try {
      for (const update of competitorSalesToUpdate) {
        const { id, ...updateData } = update
        await CompetitorSale.query(trx).update(updateData).where('id', id)
      }
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  // Insert CompetitorSales in bulk
  if (competitorSalesToInsert.length > 0) {
    await CompetitorSale.query().insert(competitorSalesToInsert)
  }

  return {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted,
    },
    rows: { createdRows, updatedRows, deletedRows, identicalRows, rejected, received: data.length },
    ordersInFile,
  }
}

export async function updatePetroCanadaReport({ fileName, reportId, rows }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejected },
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function create7ElevenData({ fileName, fileContent, s3FileName }) {
  const {
    data: { date, sales },
    totalRowsReceived,
  } = await parseSevenElevenSellOut({
    stream: fileContent,
  })

  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [],
      received: totalRowsReceived,
    },
    reportIds: [],
  }

  if (!sales || sales.length === 0) {
    throw new FileLevelError('No data found in 7Eleven file.')
  }

  const products = await CustomerUpc.query()
    .select()
    .where('banner', BANNERS.SEVEN_ELEVEN)
    .withGraphFetched('format.skus')

  const periodStart = moment.utc(date).startOf('month')
  const periodEnd = moment.utc(date).endOf('month')

  // Create or find DataImport for this week
  const dataImport =
    (await DataImport.query()
      .where('period_start', periodStart.format('YYYY-MM-DD'))
      .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
      .andWhere('file_origin', BANNERS.SEVEN_ELEVEN)
      .first()) ||
    (await DataImport.query().insert({
      periodStart: periodStart.format('YYYY-MM-DD'),
      periodEnd: periodEnd.format('YYYY-MM-DD'),
      weeksIncluded: Math.abs(moment.utc(date).startOf('month').diff(moment.utc(date).endOf('month'), 'weeks')),
      rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
      fileOrigin: BANNERS.SEVEN_ELEVEN,
    }))

  const { result, rows } = await save7ElevenData({
    data: sales,
    periodStart,
    periodEnd,
    dataImport,
    products,
  })

  // Accumulate results across all weeks
  uploadResult.reportIds.push(dataImport.id)
  uploadResult.result.ordersCreated += result.ordersCreated
  uploadResult.result.ordersUpdated += result.ordersUpdated
  uploadResult.result.ordersDeleted += result.ordersDeleted
  uploadResult.rows.createdRows += rows.createdRows
  uploadResult.rows.updatedRows += rows.updatedRows
  uploadResult.rows.deletedRows += rows.deletedRows
  uploadResult.rows.identicalRows += rows.identicalRows
  uploadResult.rows.rejected = [...uploadResult.rows.rejected, ...rows.rejected]

  uploadResult.rows.rejected = uniq(uploadResult.rows.rejected)

  return uploadResult
}

export async function save7ElevenData({ data, periodStart, periodEnd, dataImport, products }) {
  const customers = await Customer.query().select().where('banner', 'like', `%${BANNERS.SEVEN_ELEVEN}%`)

  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0

  const rejected = []

  const competitorSales = await CompetitorSale.query().select('*').where('file_import', dataImport.id)

  const query = `
  SELECT
    orders.id
  from orders
  left join orders_content on orders_content.billing_document_id = orders.id
  join customers on customers.id = orders.customer_id
  where banner = '${BANNERS.SEVEN_ELEVEN}'
  and order_date >= '${moment(periodStart).format('YYYY-MM-DD')}' and order_date <='${moment(periodEnd).format(
    'YYYY-MM-DD',
  )}'
`
  const { rows: orderIds } = await CustomerUpc.knex().raw(query)
  const orders = await Order.query()
    .select()
    .whereIn(
      'id',
      orderIds.map((id) => id.id),
    )
    .withGraphFetched('content')

  // Now create/update competitor sales for each store with aggregated values
  for (const { id: storeId, lines, ryde, rom } of data) {
    const customer = customers.find((c) => c.bannerInternalId === storeId)

    if (!customer) {
      rejected.push(ERRORS.invalidSiteNumber(`[${lines.join(', ')}]`, storeId))
      continue
    }

    const { byUpc } = ryde
    const content = []
    for (const [upc, { units, sales }] of Object.entries(byUpc)) {
      const linkedProduct = products.find((p) => p.customerUpc === upc)
      if (!linkedProduct) {
        rejected.push(ERRORS.invalidUPC(`[${lines.join(', ')}]`, upc))
        continue
      }

      const activeSku = linkedProduct.format.skus[0].sku
      content.push({ sku: activeSku, quantity: units, netValue: sales, upc })
    }

    const orderAlreadyExists = orders.find((o) => String(o.customerId) === String(customer.id))

    if (orderAlreadyExists) {
      for (const skuContent of orderAlreadyExists.content) {
        const currentContent = content.find((c) => c.upc === skuContent.upc)
        if (currentContent) {
          if (skuContent.quantity !== currentContent.quantity || currentContent.netValue !== skuContent.netValue) {
            await OrderContent.query()
              .update({
                quantity: currentContent.quantity,
                netValue: currentContent.netValue,
              })
              .where('id', skuContent.id)
          }
        }
      }
    } else {
      // Only create order if content is not empty
      if (content.length > 0) {
        const newOrder = await Order.query().insert({
          customerId: customer.id,
          orderDate: moment(periodStart).format('YYYY-MM-DD'),
        })
        for (const { sku, quantity, netValue, upc } of content) {
          await OrderContent.query().insert({ sku, quantity, netValue, upc, billingDocumentId: newOrder.id })
        }
      }
    }

    const competitorSalesExists = competitorSales.find((cs) => Number(cs.customerId) === Number(customer.id))

    const competitorData = {
      customerId: Number(customer.id),
      rydeUnits: ryde.units,
      rydeValue: round(ryde.sales, 2),
      romUnits: rom.units,
      romValue: round(rom.sales, 2),
      fileImport: dataImport.id,
    }

    if (competitorSalesExists) {
      // Check if values are different
      if (
        competitorSalesExists.rydeUnits !== competitorData.rydeUnits ||
        competitorSalesExists.rydeValue !== competitorData.rydeValue ||
        competitorSalesExists.romUnits !== competitorData.romUnits ||
        competitorSalesExists.romValue !== competitorData.romValue
      ) {
        await CompetitorSale.query().update(competitorData).where('id', competitorSalesExists.id)
        updatedRows++
      } else {
        identicalRows++
      }
    } else {
      await CompetitorSale.query().insert(competitorData)
      createdRows++
    }
  }

  return {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: { createdRows, updatedRows, deletedRows: 0, identicalRows, rejected, received: data.length },
  }
}

export async function update7ElevenReport({ fileName, reportId, rows }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejected },
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function createNapOrangeData({ fileContent }) {
  const contentBySheet = await readExcelFile({
    stream: fileContent,
    expected: [
      {
        sheetName: 'DATA',
        columns: [
          'Week',
          'Week Wending Date',
          'Location',
          'Site Name',
          'Store',
          'ERP',
          'TM',
          'OT',
          'Site_Details',
          'Description',
          'Total Qty',
          'Total Amount',
        ],
      },
    ],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName === 'DATA')

  if (!reportData) throw new FileLevelError('Missing expected DATA sheet.')

  const receivedRows = reportData.values

  const INVALID_DATE = 'Invalid date'

  const rowsByWeek = groupBy(receivedRows, (rd) => {
    if (!rd.weekWendingDate) return INVALID_DATE
    return moment.utc(rd.weekWendingDate).startOf('isoWeek').format('YYYY-MM-DD')
  })

  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [],
      received: receivedRows.length,
    },
    reportIds: [],
  }

  const customers = await Customer.query().select().where('banner', 'like', `%${BANNERS.NAP_ORANGE}%`)
  const SKUS_TO_USE = [
    { sku: '100054', product: 'Relax' },
    { sku: '100051', product: 'Energize' },
    { sku: '100101', product: 'Focus' },
  ]

  for (const [weekStart, weekRows] of Object.entries(rowsByWeek)) {
    if (weekStart === INVALID_DATE) continue
    const periodStart = moment.utc(weekStart)
    const periodEnd = moment.utc(weekStart).endOf('isoWeek')

    const dataImport =
      (await DataImport.query()
        .where('period_start', periodStart.format('YYYY-MM-DD'))
        .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
        .andWhere('file_origin', BANNERS.NAP_ORANGE)
        .first()) ||
      (await DataImport.query().insert({
        periodStart: periodStart.format('YYYY-MM-DD'),
        periodEnd: periodEnd.format('YYYY-MM-DD'),
        weeksIncluded: 1,
        rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
        fileOrigin: BANNERS.NAP_ORANGE,
      }))

    const { result, rows } = await saveNapOrangeData({
      data: weekRows,
      periodStart,
      periodEnd,
      dataImport,
      customers,
      products: SKUS_TO_USE,
    })

    uploadResult.reportIds.push(dataImport.id)
    uploadResult.result.ordersCreated += result.ordersCreated
    uploadResult.result.ordersUpdated += result.ordersUpdated
    uploadResult.result.ordersDeleted += result.ordersDeleted
    uploadResult.rows.createdRows += rows.createdRows
    uploadResult.rows.updatedRows += rows.updatedRows
    uploadResult.rows.deletedRows += rows.deletedRows
    uploadResult.rows.identicalRows += rows.identicalRows
    uploadResult.rows.rejected = [...uploadResult.rows.rejected, ...rows.rejected]
  }

  if (rowsByWeek[INVALID_DATE]) {
    uploadResult.rows.rejected = [
      ...uploadResult.rows.rejected,
      ERRORS.custom(rowsByWeek[INVALID_DATE].map((r) => r.rowNumber).join(', '), 'Invalid date provided'),
    ]
  }

  return uploadResult
}

async function saveNapOrangeData({ data, periodStart, periodEnd, customers, products }) {
  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0
  const rejected = []

  const existingOrders = await Order.query()
    .withGraphFetched('content')
    .where('order_date', '>=', periodStart.format('YYYY-MM-DD'))
    .andWhere('order_date', '<=', periodEnd.format('YYYY-MM-DD'))

  const byStore = groupBy(data, 'erp')

  for (const [erp, storeRows] of Object.entries(byStore)) {
    if (erp === '') {
      rejected.push(ERRORS.invalidERP(storeRows.map((r) => r.row).join(', '), erp))
      continue
    }
    const customer = customers.find((c) => String(c.batId) === String(erp))

    if (!customer) {
      rejected.push(ERRORS.invalidERP(storeRows.map((r) => r.row).join(', '), erp))
      continue
    }

    const content = []
    for (const storeRow of storeRows) {
      const quantity = Number(storeRow.totalQty)
      if (!quantity || quantity === 0) continue

      const linkedProduct = products.find((p) => storeRow.description.includes(p.product))

      if (!linkedProduct) {
        rejected.push(ERRORS.custom(storeRow.row, `Could not map Description "${storeRow.description}" to a product`))
        continue
      }

      content.push({
        sku: linkedProduct.sku,
        quantity,
        netValue: Number(storeRow.totalAmount) || 0,
        upc: storeRow.description,
      })
    }

    if (content.length === 0) continue

    const orderDate = periodStart.format('YYYY-MM-DD')
    const orderAlreadyExists = existingOrders.find(
      (o) => String(o.customerId) === String(customer.id) && moment(o.orderDate).format('YYYY-MM-DD') === orderDate,
    )

    if (orderAlreadyExists) {
      let orderIsUpdated = false
      for (const item of content) {
        const existingContent = orderAlreadyExists.content.find((c) => c.upc === item.upc)
        if (existingContent) {
          if (existingContent.quantity !== item.quantity) {
            await OrderContent.query().update({ quantity: item.quantity }).where('id', existingContent.id)
            updatedRows++
            orderIsUpdated = true
          } else {
            identicalRows++
          }
        } else {
          await OrderContent.query().insert({
            quantity: item.quantity,
            sku: item.sku,
            netValue: item.netValue,
            billingDocumentId: orderAlreadyExists.id,
            upc: item.upc,
          })
          createdRows++
          orderIsUpdated = true
        }
      }
      if (orderIsUpdated) ordersUpdated++
    } else {
      const newOrder = await Order.query().insert({ customerId: customer.id, orderDate })
      ordersCreated++
      for (const item of content) {
        await OrderContent.query().insert({
          quantity: item.quantity,
          sku: item.sku,
          netValue: item.netValue,
          billingDocumentId: newOrder.id,
          upc: item.upc,
        })
        createdRows++
      }
    }
  }

  return {
    result: { ordersCreated, ordersUpdated, ordersDeleted: 0 },
    rows: { createdRows, updatedRows, deletedRows: 0, identicalRows, rejected, received: data.length },
  }
}

export async function updateNapOrangeReport({ fileName, reportId, rows }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejected },
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}

export async function createSobeysData({ fileContent }) {
  const contentBySheet = await readExcelFile({
    stream: fileContent,
    expected: [
      {
        sheetName: 'DATA',
        columns: [
          'Site',
          'Name',
          'Fiscal Week',
          'Article',
          'SKU',
          'Net contents',
          'UNITS',
          'GSR',
          'Banner2',
          'Region',
          'Week Ending',
          'ERP',
          'Owner',
          'Province',
          'BAM',
          'TM',
        ],
      },
    ],
  })

  const reportData = contentBySheet.find((cbs) => cbs.sheetName === 'DATA')

  if (!reportData) throw new FileLevelError('Missing expected DATA sheet.')

  const receivedRows = reportData.values

  const INVALID_DATE = 'Invalid date'

  const rowsByWeek = groupBy(receivedRows, (rd) => {
    if (!rd.weekEnding) return INVALID_DATE
    return moment.utc(rd.weekEnding).startOf('isoWeek').format('YYYY-MM-DD')
  })

  const uploadResult = {
    result: {
      ordersCreated: 0,
      ordersUpdated: 0,
      ordersDeleted: 0,
    },
    rows: {
      createdRows: 0,
      updatedRows: 0,
      deletedRows: 0,
      identicalRows: 0,
      rejected: [],
      received: receivedRows.length,
      invalidCustomers: [],
    },
    reportIds: [],
  }

  const customers = await Customer.query().select().where('banner', 'like', `%${BANNERS.SOBEYS}%`)
  const upcProducts = await CustomerUpc.query().select().where('banner', BANNERS.SOBEYS).withGraphFetched('format.skus')

  const SKUS_TO_USE = ['100054', '100051', '100101']
  const products = SKUS_TO_USE.map((sku) => {
    const linkedProduct = upcProducts.find((product) => product.format.skus.find((s) => s.sku === sku))
    return { sku, upc: linkedProduct.customerUpc }
  })

  for (const [weekStart, weekRows] of Object.entries(rowsByWeek)) {
    if (weekStart === INVALID_DATE) continue
    const periodStart = moment.utc(weekStart)
    const periodEnd = moment.utc(weekStart).endOf('isoWeek')

    const dataImport =
      (await DataImport.query()
        .where('period_start', periodStart.format('YYYY-MM-DD'))
        .andWhere('period_end', periodEnd.format('YYYY-MM-DD'))
        .andWhere('file_origin', BANNERS.SOBEYS)
        .first()) ||
      (await DataImport.query().insert({
        periodStart: periodStart.format('YYYY-MM-DD'),
        periodEnd: periodEnd.format('YYYY-MM-DD'),
        weeksIncluded: 1,
        rydeWeek: moment(periodStart).diff(moment('2023-11-06'), 'week'),
        fileOrigin: BANNERS.SOBEYS,
      }))

    const { result, rows } = await saveSobeysData({
      data: weekRows,
      periodStart,
      periodEnd,
      customers,
      products,
    })

    uploadResult.reportIds.push(dataImport.id)
    uploadResult.result.ordersCreated += result.ordersCreated
    uploadResult.result.ordersUpdated += result.ordersUpdated
    uploadResult.result.ordersDeleted += result.ordersDeleted
    uploadResult.rows.createdRows += rows.createdRows
    uploadResult.rows.updatedRows += rows.updatedRows
    uploadResult.rows.deletedRows += rows.deletedRows
    uploadResult.rows.identicalRows += rows.identicalRows
    uploadResult.rows.rejected = [...uploadResult.rows.rejected, ...rows.rejected]
    uploadResult.rows.invalidCustomers = [...uploadResult.rows.invalidCustomers, ...rows.invalidCustomers]
  }

  if (rowsByWeek[INVALID_DATE]) {
    uploadResult.rows.rejected = [
      ...uploadResult.rows.rejected,
      ERRORS.custom(rowsByWeek[INVALID_DATE].map((r) => r.rowNumber).join(', '), 'Invalid date provided'),
    ]
  }

  uploadResult.rows.rejected = [
    ...uploadResult.rows.rejected,
    ...buildInvalidCustomerErrors(uploadResult.rows.invalidCustomers),
  ]

  return uploadResult
}

async function saveSobeysData({ data, periodStart, periodEnd, customers, products }) {
  let ordersCreated = 0
  let ordersUpdated = 0
  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0
  const rejected = []
  const invalidCustomers = []

  const existingOrders = await Order.query()
    .withGraphFetched('content')
    .where('order_date', '>=', periodStart.format('YYYY-MM-DD'))
    .andWhere('order_date', '<=', periodEnd.format('YYYY-MM-DD'))

  const byStore = groupBy(data, 'site')

  for (const [erp, storeRows] of Object.entries(byStore)) {
    const customer = customers.find((c) => String(c.bannerInternalId) === String(erp))

    if (!customer) {
      invalidCustomers.push({ id: erp, rows: storeRows.map((r) => r.row) })
      continue
    }

    const content = []
    for (const storeRow of storeRows) {
      const quantity = Number(storeRow.units)
      if (!quantity || quantity === 0) continue

      const linkedProduct = products.find((p) => String(p.upc) === String(storeRow.article))

      if (!linkedProduct) {
        rejected.push(ERRORS.custom(storeRow.row, `Could not map Article "${storeRow.article}" to a product`))
        continue
      }
      content.push({ sku: linkedProduct.sku, quantity, netValue: Number(storeRow.gsr) || 0, upc: storeRow.sku })
    }

    if (content.length === 0) continue

    const orderDate = periodStart.format('YYYY-MM-DD')
    const orderAlreadyExists = existingOrders.find(
      (o) => String(o.customerId) === String(customer.id) && moment(o.orderDate).format('YYYY-MM-DD') === orderDate,
    )

    if (orderAlreadyExists) {
      let orderIsUpdated = false
      for (const item of content) {
        const existingContent = orderAlreadyExists.content.find((c) => c.upc === item.upc)
        if (existingContent) {
          if (existingContent.quantity !== item.quantity) {
            await OrderContent.query().update({ quantity: item.quantity }).where('id', existingContent.id)
            updatedRows++
            orderIsUpdated = true
          } else {
            identicalRows++
          }
        } else {
          await OrderContent.query().insert({
            quantity: item.quantity,
            sku: item.sku,
            netValue: item.netValue,
            billingDocumentId: orderAlreadyExists.id,
            upc: item.upc,
          })
          createdRows++
          orderIsUpdated = true
        }
      }
      if (orderIsUpdated) ordersUpdated++
    } else {
      const newOrder = await Order.query().insert({ customerId: customer.id, orderDate })
      ordersCreated++
      for (const item of content) {
        await OrderContent.query().insert({
          quantity: item.quantity,
          sku: item.sku,
          netValue: item.netValue,
          billingDocumentId: newOrder.id,
          upc: item.upc,
        })
        createdRows++
      }
    }
  }

  return {
    result: { ordersCreated, ordersUpdated, ordersDeleted: 0 },
    rows: {
      createdRows,
      updatedRows,
      deletedRows: 0,
      identicalRows,
      rejected,
      received: data.length,
      invalidCustomers,
    },
  }
}

export async function updateSobeysReport({ fileName, reportId, rows }) {
  await Report.query()
    .update({
      created: rows.createdRows,
      deleted: rows.deletedRows,
      updated: rows.updatedRows,
      warnings: { rejected: rows.rejected },
      fileName,
      notifSent: true,
    })
    .where('id', reportId)
}
