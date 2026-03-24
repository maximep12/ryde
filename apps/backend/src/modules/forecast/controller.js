import { readExcelFile } from 'lib/FileParser/excel'
import { sendSlackNotification, SLACK_CONTEXT } from 'lib/slack'
import difference from 'lodash/difference'
import omit from 'lodash/omit'
import Forecast from 'models/forecast'

import ProductSku from 'models/productSku'
import Report from 'models/report'
import moment from 'moment'

import { ERRORS, FORECASTS, UPLOAD_RESULT_STATES } from 'utils/constants'

export async function importAmazonForecast(ctx) {
  console.log('[REPORT] - Amazon Forecast start')
  const startTime = moment().format()
  const fileName = ctx.request.header['content-disposition']?.replace('filename=', '') || 'unknown'

  const newReport = await Report.query().insert({
    type: FORECASTS.amazon,
    reportStart: startTime,
    fileName,
    notifSent: false,
  })

  const existingSkus = await ProductSku.query().select()
  const validSkus = existingSkus.map((es) => es.sku)

  try {
    const contentBySheet = await readExcelFile({
      stream: ctx.req,
      allowMissingColumns: true,
      expected: [
        {
          sheetName: 'Data',
          columns: ['Year', 'Month'],
        },
      ],
      optional: [
        {
          sheetName: 'Data',
          columns: [...validSkus],
        },
      ],
    })

    const { values } = contentBySheet.find((cbs) => cbs.sheetName === 'Data')

    const excluded = []
    const forecasts = values.reduce((acc, it) => {
      const { year, month, row } = it

      const skusForecast = omit(it, ['year', 'month', 'row'])
      const invalidSkusProvided = difference(Object.keys(skusForecast), validSkus)

      if (invalidSkusProvided.length) {
        excluded.push(
          ERRORS.custom(
            row,
            `Invalid sku provided. Provided: [${invalidSkusProvided.join(', ')}]. Valid: [${validSkus.join(', ')}]`,
          ),
        )
        return acc
      }

      if (!year || !month) {
        excluded.push(ERRORS.missingColumn(['year', 'month'].join()))
        return acc
      }

      let skuValuesAreValid = true
      for (const [sku, forecast] of Object.entries(skusForecast)) {
        if (forecast && isNaN(Number(forecast))) {
          excluded.push(ERRORS.invalidQuantity(`${row}-${sku}`, forecast))
          skuValuesAreValid = false
        }
      }

      if (!skuValuesAreValid) return acc

      return [
        ...acc,
        {
          year,
          month,
          skus: Object.entries(skusForecast).map(([sku, quantity]) => ({
            sku,
            quantity,
          })),
        },
      ]
    }, [])

    let forecastsCreated = 0
    let forecastsUpdated = 0
    let createdRows = 0
    let updatedRows = 0
    let deletedRows = 0
    let identicalRows = 0

    const existingForecasts = await Forecast.query().select()

    for (const forecast of forecasts) {
      const { year, month, skus } = forecast
      const rowAlreadyExisted = existingForecasts.filter((f) => f.year === Number(year) && f.month === Number(month))

      if (rowAlreadyExisted.length) {
        let forecastInRowUpdated = false
        for (const currentSkuForecast of skus) {
          const roundedQuantity = Number(parseFloat(currentSkuForecast.quantity).toFixed(2))
          const forecastAlreadyExists = rowAlreadyExisted.find((forecast) => forecast.sku === currentSkuForecast.sku)
          if (forecastAlreadyExists) {
            if (roundedQuantity !== forecastAlreadyExists.quantity) {
              await Forecast.query().update({ quantity: roundedQuantity }).where('id', forecastAlreadyExists.id)
              forecastsUpdated++
              forecastInRowUpdated = true
            }
          } else {
            await Forecast.query().insert({
              year,
              month,
              sku: currentSkuForecast.sku,
              quantity: roundedQuantity,
            })
            forecastsCreated++
            forecastInRowUpdated = true
          }
        }

        for (const previouslyExistingForecast of rowAlreadyExisted) {
          if (!skus.map((s) => s.sku).includes(previouslyExistingForecast.sku)) {
            await Forecast.query().delete().where('id', previouslyExistingForecast.id)
            forecastInRowUpdated = true
          }
        }

        if (forecastInRowUpdated) updatedRows++
        else identicalRows++
      } else {
        for (const currentSkuForecast of skus) {
          const roundedQuantity = Number(parseFloat(currentSkuForecast.quantity).toFixed(2))
          await Forecast.query().insert({
            year,
            month,
            sku: currentSkuForecast.sku,
            quantity: roundedQuantity,
          })
          forecastsCreated++
        }
        createdRows++
      }
    }

    const forecastsToDelete = existingForecasts.filter(
      (ef) => !forecasts.find((f) => Number(f.year) === ef.year && Number(f.month) === ef.month),
    )

    for (const toDelete of forecastsToDelete) {
      const deleted = await Forecast.query().delete().where({
        year: toDelete.year,
        month: toDelete.month,
      })
      if (deleted > 0) deletedRows++
    }

    console.log('[REPORT] - Amazon Forecast success')
    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.amazonForecast })
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
        created: forecastsCreated,
        updated: forecastsUpdated,
        unit: 'Amazon forecasts',
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
    console.log('[REPORT] - Amazon Forecast error: ', JSON.stringify(error))
    const { message, code } = error

    await sendSlackNotification({
      error,
      context: SLACK_CONTEXT.amazonForecast,
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
    console.log('[REPORT] - Amazon Forecast end')
  }
}
