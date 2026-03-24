import moment from 'moment'
import groupBy from 'lodash/groupBy'
import camelCase from 'lodash/camelCase'
import flatten from 'lodash/flatten'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import lowerCase from 'lodash/lowerCase'

import AmazonOrder from 'models/amazonOrder'
import AmazonBundle from 'models/amazonBundle'
import AmazonBundleOrder from 'models/amazonBundleOrder'
import AmazonOrderContent from 'models/amazonOrderContent'
import ProductSku from 'models/productSku'

import { getProvinceByZipCode } from 'helpers'
import { ERRORS } from 'utils/constants'

export async function updateAmazonOrders({ orders }) {
  let ordersCreated = 0
  let ordersUpdated = 0
  let rowsCreated = 0
  let rowsUpdated = 0
  let deletedRows = 0
  let identicalRows = 0
  let ordersCancelled = 0

  const existingOrders = await AmazonOrder.query()
    .select(['id', 'order_id', 'order_status'])
    .whereIn(
      'order_id',
      orders.map((order) => order.orderId),
    )
    .withGraphFetched('content')

  for (const order of orders) {
    const linkedOrder = existingOrders.find((existing) => existing.orderId === order.orderId)
    if (linkedOrder) {
      const statusIsSame = linkedOrder.orderStatus === order.orderStatus

      if (!statusIsSame) {
        if (order.orderStatus === 'Cancelled') ordersCancelled++
        await AmazonOrder.query().update({ orderStatus: order.orderStatus }).where('id', linkedOrder.id)
        ordersUpdated++
        rowsUpdated += order.content.length
      }
      for (const rowItem of order.content) {
        const linkedItem = linkedOrder.content.find((c) => c.sku === rowItem.sku)

        if (linkedItem) {
          if (itemsAreEquals({ alreadyCreated: linkedItem, newRow: rowItem })) {
            identicalRows++
          } else {
            await AmazonOrderContent.query()
              .update({
                quantity: rowItem.quantity,
                netValue: rowItem.netValue,
                currency: rowItem.currency,
                asin: rowItem.asin,
              })
              .findById(linkedItem.id)
            if (statusIsSame) rowsUpdated++
          }
        } else {
          await AmazonOrderContent.query().insert(rowItem)
          await AmazonOrderContent.query().insert({ ...rowItem, orderId: linkedOrder.orderId })
          rowsCreated++
        }
      }

      if (linkedOrder.content.length > order.content.length) {
        const rowsToDelete = linkedOrder.content.filter((c) => {
          return !order.content.map((o) => o.sku).includes(c.sku)
        })

        for (const row of rowsToDelete) {
          await AmazonOrderContent.query().update({ quantity: 0 }).where('sku', row.sku).andWhere('id', row.id)
          deletedRows++
        }
      }
    } else {
      const created = await AmazonOrder.query().upsertGraph(order, { insertMissing: true })
      ordersCreated++
      rowsCreated += created.content.length
    }
  }

  return { rowsCreated, rowsUpdated, deletedRows, identicalRows, ordersCreated, ordersUpdated, ordersCancelled }
}

export async function buildOrdersFromGroup({ data }) {
  const ordersToUpdate = groupBy(data, 'amazonOrderId')

  const products = await ProductSku.query().select().modify('onlyAmazon').withGraphFetched('format')
  const res = await Promise.all(
    Object.values(ordersToUpdate).map(async (content) => {
      const { purchaseDate, amazonOrderId, shipState, orderStatus, shipPostalCode, shipCountry, salesChannel } =
        content[0]

      const orderLocation = await getProvinceByZipCode({
        amazonOrderId,
        zipCode: shipPostalCode,
        province: shipState,
        country: shipCountry,
      })

      const orderToCreate = {
        orderId: amazonOrderId,
        orderDate: moment.utc(purchaseDate).format(),
        orderStatus,
        country: orderLocation?.country,
        shipState: orderLocation?.shipState,
        salesChannel,
      }

      const contentBySku = content.reduce((acc, contentRow) => {
        const { asin, sku, quantity, currency, rowNumber } = contentRow
        let { itemPrice } = contentRow
        if (itemPrice === '') itemPrice = 0

        const asinAlreadyUsed = acc[asin]
        if (asinAlreadyUsed) {
          asinAlreadyUsed.quantity += Number(quantity)
          asinAlreadyUsed.netValue += Number(itemPrice)
          asinAlreadyUsed.rows = [...asinAlreadyUsed.rows, rowNumber]

          return { ...acc, [asin]: asinAlreadyUsed }
        }

        const linkedProduct = products.find((pro) => pro.sku === sku && pro.asin === asin)
        return {
          ...acc,
          [asin]: {
            sku,
            quantity: Number(quantity),
            netValue: Number(itemPrice),
            packSize: linkedProduct?.format?.numerator,
            currency,
            asin,
            orderId: amazonOrderId,
            rows: [rowNumber],
          },
        }
      }, {})

      const contentToStore = Object.values(contentBySku)
      return { ...orderToCreate, rows: flatten(contentToStore.map((c) => c.rows)), content: contentToStore }
    }),
  )

  return res
}

export async function validateRows({ orders }) {
  const products = await ProductSku.query().select().modify('onlyAmazon').withGraphFetched('format')

  // const previousMonday = moment.utc().startOf('isoweek')

  const result = { validOrders: [], rejectedRows: [] }

  for (const order of orders) {
    const { shipPostalCode, shipState, orderStatus, salesChannel, country, rows, content } = order

    // const formattedDate = new Date(orderDate.replace(/T(\d):/, 'T0$1:'))

    if (!['Amazon.com', 'Amazon.ca'].includes(salesChannel)) {
      result.rejectedRows.push(ERRORS.invalidAmazonOrigin(rows.join(), ['Amazon.com', 'Amazon.ca'], salesChannel))
      continue
    }

    // if (previousMonday.isBefore(moment.utc(formattedDate))) {
    //   result.rejectedRows.push(ERRORS.invalidAmazonDate(rows.join(), orderDate))
    //   continue
    // }

    if (!country || !shipState) {
      result.rejectedRows.push(
        ERRORS.custom(
          rows.join(','),
          `Could not assign this postal code (${shipPostalCode}) to a province. Tell Volume7 immediately.`,
        ),
      )
      continue
    }

    order.content = content.reduce((acc, rowItem) => {
      const { netValue, packSize, asin, sku, rows } = rowItem
      const formattededSku = sku.replace(/^-+|-+$/g, '')

      const rowsIndex = rows.join(',')

      if (netValue === 0 && orderStatus !== 'Cancelled') {
        result.rejectedRows.push(
          ERRORS.custom(rowsIndex, `Item price is = 0 and status is not Cancelled (${orderStatus})`),
        )
        return acc
      }

      if (!packSize) {
        const linkedProduct = products.find((pro) => pro.sku === formattededSku && pro.asin === asin)
        if (!linkedProduct) {
          result.rejectedRows.push(ERRORS.invalidSKU(rowsIndex, sku))
          return acc
        }
        if (!linkedProduct.format) {
          result.rejectedRows.push(
            ERRORS.custom(rowsIndex, `Selected SKU has no pack format linked to it. Tell Volume7 immediately.`),
          )
          return acc
        }
      }

      return [...acc, omit({ ...rowItem, sku: formattededSku }, ['row', 'rows'])]
    }, [])

    result.validOrders = [...result.validOrders, omit(order, ['salesChannel', 'rows'])]
  }

  return result
}

export async function validateBundleRows({ rows }) {
  const availableBundles = await AmazonBundle.query()

  // const previousMonday = moment.utc().startOf('isoweek')

  return rows.reduce(
    (acc, it, index) => {
      const { bundleAsin, title } = it
      const currentRow = index + 2

      // if (previousMonday.isBefore(moment.utc(date, 'MM/DD/YYYY'))) {
      //   return { ...acc, rejectedRows: [...acc.rejectedRows, ERRORS.invalidAmazonBundleDate(currentRow, date)] }
      // }

      const linkedBundle = availableBundles.find((bundle) => bundle.asin === bundleAsin)
      if (!linkedBundle)
        return {
          ...acc,
          rejectedRows: [...acc.rejectedRows, ERRORS.invalidAmazonBundleAsin(currentRow, bundleAsin)],
        }

      const namesAreMatching = lowerCase(linkedBundle.amazonName) === lowerCase(title)
      if (!namesAreMatching)
        return {
          ...acc,
          rejectedRows: [
            ...acc.rejectedRows,
            ERRORS.amazonBundleTitleChanged(currentRow, title, linkedBundle.amazonName),
          ],
        }

      return { ...acc, validRows: [...acc.validRows, it] }
    },
    { validRows: [], rejectedRows: [] },
  )
}

function itemsAreEquals({ newRow, alreadyCreated }) {
  const propsToOmit = ['createdAt', 'updatedAt', 'id', 'netValue', 'net_value', 'orderId', 'rows']

  const onlyPropsNeeded = omit(alreadyCreated, propsToOmit)
  const newWithOnlyProps = omit(newRow, propsToOmit)
  const newRowString = Object.entries(newWithOnlyProps).reduce((acc, [key, v]) => {
    return { ...acc, [camelCase(key)]: String(v) }
  }, {})

  const oldRowString = Object.entries(onlyPropsNeeded).reduce((acc, [key, v]) => {
    return { ...acc, [camelCase(key)]: String(v) }
  }, {})

  return isEqual(newRowString, oldRowString)
}

export async function processBundleRows(rows) {
  const existingOrders = await AmazonBundleOrder.query()

  let createdRows = 0
  let updatedRows = 0
  let identicalRows = 0

  for (const currentBundle of rows) {
    const { date, bundleAsin, bundlesSold, totalSales } = currentBundle
    const currentBundleDate = moment.utc(date).format('YYYY-MM-DD')
    const orderAlreadyExists = existingOrders.find(
      (order) => moment(order.date).format('YYYY-MM-DD') === currentBundleDate && order.asin === bundleAsin,
    )

    if (orderAlreadyExists) {
      if (orderAlreadyExists.quantity !== Number(bundlesSold) || orderAlreadyExists.netValue !== Number(totalSales)) {
        await AmazonBundleOrder.query()
          .update({
            quantity: bundlesSold,
            net_value: totalSales,
          })
          .where('asin', bundleAsin)
          .andWhere('date', currentBundleDate)
        updatedRows++
      } else {
        identicalRows++
      }
    } else {
      await AmazonBundleOrder.query().insert({
        asin: bundleAsin,
        date: currentBundleDate,
        quantity: bundlesSold,
        net_value: totalSales,
      })
      createdRows++
    }
  }

  return { createdRows, updatedRows, identicalRows }
}
