import moment from 'moment'
import Customer from 'models/customer'
import ProductFormat from 'models/productFormat'
import Order from 'models/order'
import OrderContent from 'models/orderContent'
import { BANNERS, ERRORS } from 'utils/constants'
import uniq from 'lodash/uniq'
import groupBy from 'lodash/groupBy'
import FileLevelError from 'utils/FileLevelError'

export async function saveSelloutCircleKData({ data }) {
  const startOfInsertions = moment().format()

  const locationSales = groupBy(data, 'siteNumber')

  const formats = await ProductFormat.query()
    .select()
    .whereIn('upc', uniq(data.map((row) => row.upc)))

  const customers = await Customer.query().select().whereIn('banner', Object.values(BANNERS.CIRCLE_K))

  const rejected = []
  const byDate = Object.entries(locationSales).reduce((acc, [locationId, orders]) => {
    const linkedCustomer = customers.find((customer) => Number(customer.bannerInternalId) === Number(locationId))
    if (!linkedCustomer) {
      rejected.push(ERRORS.invalidSiteNumber(orders.map((o) => o.row).join(), locationId))
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

        return {
          sku: linkedFormat?.productSku,
          quantity: o.singleUnitsSold,
          netValue: o.sales,
        }
      })

      return { date, quantities: qtyRows }
    })

    return { ...acc, [linkedCustomer.id]: quantitiesOrdered }
  }, {})

  for (const [erp, orders] of Object.entries(byDate)) {
    for (const order of orders) {
      if (order.date === 'Grand Total' || !erp || !order.date) continue
      const newOrder = await Order.query().insert({ customerId: erp, orderDate: order.date }).onConflict().ignore()
      if (!newOrder.id) continue
      for (const quantity of order.quantities) {
        await OrderContent.query().insert({
          quantity: quantity.quantity,
          sku: quantity.sku,
          netValue: quantity.netValue,
          billingDocumentId: newOrder.id,
          upc: quantity.upc,
        })
      }
    }
  }

  const createdOrders = await Order.query().select().where('created_at', '>=', startOfInsertions)
  return { created: createdOrders.length, rejected }
}

export function formatFileNameToS3({ fileName }) {
  const fileNameParts = fileName.split('.')
  if (fileNameParts.length !== 2)
    throw new FileLevelError(
      `Wrong file name provided (${fileName}): a file name must contains characters followed by a dot (.) and other characters.`,
    )

  return fileNameParts[0].concat(moment().format('YY-MM-DD-hh-mm-ss'), '.', fileNameParts[1])
}
