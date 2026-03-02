import groupBy from 'lodash/groupBy'
import round from 'lodash/round'
import sumBy from 'lodash/sumBy'

import CompetitorSale from 'models/competitorSale'
import Order from 'models/order'
import OrderContent from 'models/orderContent'

export async function createRabbaCompetitorSales({
  rydeOrders,
  othersOrders,
  customerId,
  dataImportId,
  competitorData,
}) {
  const data = {
    rydeUnits: sumBy(rydeOrders, 'quantity'),
    rydeValue: round(sumBy(rydeOrders, 'netValue'), 2),
    romUnits: sumBy(othersOrders, 'quantity'),
    romValue: round(sumBy(othersOrders, 'netValue'), 2),
    customerId,
    fileImport: dataImportId,
  }

  const linkedData = competitorData?.competitorSales.find((cd) => cd.customerId === customerId)

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

  const skuValue = groupBy(rydeOrders, 'sku')

  let order = await Order.query().select().where('order_date', orderDate).andWhere('customer_id', customerId).first()

  if (!order) {
    order = await Order.query().insert({ customerId, orderDate })
    ordersCreated++
  }

  const amountBysku = Object.entries(skuValue).map(([sku, amounts]) => ({
    sku,
    quantity: sumBy(amounts, 'quantity'),
    netValue: sumBy(amounts, 'netValue'),
    billingDocumentId: order.id,
  }))

  const contentRows = await OrderContent.query().select().where('billing_document_id', order.id)
  const rowsToDelete = contentRows.filter((cr) => !amountBysku.map((abs) => abs.sku).includes(cr.sku))
  if (rowsToDelete.length) {
    await OrderContent.query()
      .delete()
      .whereIn(
        'id',
        rowsToDelete.map((rtd) => rtd.id),
      )
    deletedRows += rowsToDelete.length
  }
  for (const skuValue of amountBysku) {
    const existingValue = contentRows.find((cr) => cr.sku === skuValue.sku)
    if (existingValue) {
      if (existingValue.quantity !== skuValue.quantity || existingValue.netValue !== skuValue.netValue) {
        await OrderContent.query().patch(skuValue).where('id', existingValue.id)
        updatedRows++
        ordersUpdated = 1
      } else {
        identicalRows++
      }
    } else {
      await OrderContent.query().insert(skuValue)
      createdRows++
    }
  }

  // AmountBysku merges similar sku to a single row
  // Which can make 3 rows beign interpreted as 1
  // If we did not create
  identicalRows = ordersCreated === 1 ? 0 : rydeOrders.length - createdRows - updatedRows

  return { ordersCreated, ordersUpdated, createdRows, updatedRows, deletedRows, identicalRows }
}
