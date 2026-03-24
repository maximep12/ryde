import { forecasts } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '../../db'
import { ContextVariables } from '../../index'
import { readExcelFile } from '../../lib/FileParser/excel'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import { requireRoles } from '../../middlewares/auth'
import { ERRORS, UPLOAD_RESULT_STATES } from '../../utils/constants'
import {
  createReport,
  getExistingForecasts,
  getReportsByType,
  getValidSkus,
  updateReportFailure,
  updateReportSuccess,
} from './helpers'

const REPORT_TYPE_AMAZON_FORECAST = 'AMAZON_FORECAST'

const logger = createBaseLogger().child({ module: 'forecast' })

const tokenIsValid = requireRoles('admin')

const forecastRouter = new Hono<{ Variables: ContextVariables }>()

export const forecastRouterDefinition = forecastRouter

  /**
   * POST /forecast/amazon — Import Amazon forecast from Excel
   */
  .post('/amazon', tokenIsValid, async (c) => {
    logger.info('Amazon forecast import start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '') || 'unknown'
    const report = await createReport(REPORT_TYPE_AMAZON_FORECAST, fileName)

    try {
      const stream = c.req.raw.body
      if (!stream) throw new HTTPException(400, { message: 'Missing file body' })

      const validSkus = await getValidSkus()

      const contentBySheet = await readExcelFile({
        stream: stream as unknown as NodeJS.ReadableStream,
        expected: [{ sheetName: 'Data', columns: ['Year', 'Month'] }],
        optional: [{ sheetName: 'Data', columns: validSkus }],
      })

      const sheetData = contentBySheet.find((s) => s.sheetName === 'Data')
      if (!sheetData) throw new HTTPException(400, { message: 'Missing Data sheet' })

      const { values } = sheetData
      const excluded: string[] = []

      type ForecastRow = { year: number; month: number; skus: { sku: string; quantity: number }[] }

      const parsedForecasts = values.reduce<ForecastRow[]>((acc, it) => {
        const { rowNumber, year, month, ...rest } = it as Record<string, unknown>

        if (!year || !month) {
          excluded.push(ERRORS.missingColumn(['year', 'month'].join()))
          return acc
        }

        const skusForecast = Object.entries(rest).filter(([key]) => validSkus.includes(key))
        const invalidSkus = Object.keys(rest).filter((key) => key !== 'rowNumber' && !validSkus.includes(key))

        if (invalidSkus.length) {
          excluded.push(
            ERRORS.custom(
              rowNumber,
              `Invalid sku provided. Provided: [${invalidSkus.join(', ')}]. Valid: [${validSkus.join(', ')}]`,
            ),
          )
          return acc
        }

        let skuValuesAreValid = true
        for (const [sku, forecast] of skusForecast) {
          if (forecast && isNaN(Number(forecast))) {
            excluded.push(ERRORS.invalidQuantity(`${String(rowNumber)}-${sku}`, forecast))
            skuValuesAreValid = false
          }
        }
        if (!skuValuesAreValid) return acc

        return [
          ...acc,
          {
            year: Number(year),
            month: Number(month),
            skus: skusForecast.map(([sku, quantity]) => ({
              sku,
              quantity: Number(parseFloat(String(quantity ?? 0)).toFixed(2)),
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

      const existingForecasts = await getExistingForecasts()

      await db.transaction(async (tx) => {
        for (const forecast of parsedForecasts) {
          const { year, month, skus } = forecast
          const rowAlreadyExisted = existingForecasts.filter((f) => f.year === year && f.month === month)

          if (rowAlreadyExisted.length) {
            let rowWasUpdated = false

            for (const { sku, quantity } of skus) {
              const existing = rowAlreadyExisted.find((f) => f.sku === sku)
              if (existing) {
                if (quantity !== existing.quantity) {
                  await tx.update(forecasts).set({ quantity }).where(eq(forecasts.id, existing.id))
                  forecastsUpdated++
                  rowWasUpdated = true
                }
              } else {
                await tx.insert(forecasts).values({ year, month, sku, quantity })
                forecastsCreated++
                rowWasUpdated = true
              }
            }

            // Delete forecasts for SKUs no longer in the file
            const incomingSkus = new Set(skus.map((s) => s.sku))
            for (const existing of rowAlreadyExisted) {
              if (!incomingSkus.has(existing.sku)) {
                await tx.delete(forecasts).where(eq(forecasts.id, existing.id))
                rowWasUpdated = true
              }
            }

            if (rowWasUpdated) updatedRows++
            else identicalRows++
          } else {
            for (const { sku, quantity } of skus) {
              await tx.insert(forecasts).values({ year, month, sku, quantity })
              forecastsCreated++
            }
            createdRows++
          }
        }

        // Delete forecasts for year/month combos no longer in the file
        const incomingPeriods = new Set(parsedForecasts.map((f) => `${f.year}-${f.month}`))
        const periodsToDelete = [...new Set(existingForecasts.map((f) => `${f.year}-${f.month}`))].filter(
          (period) => !incomingPeriods.has(period),
        )

        for (const period of periodsToDelete) {
          const [yearStr, monthStr] = period.split('-')
          const deleted = await tx
            .delete(forecasts)
            .where(and(eq(forecasts.year, Number(yearStr)), eq(forecasts.month, Number(monthStr))))
            .returning()
          if (deleted.length > 0) deletedRows++
        }
      })

      logger.info({ forecastsCreated, forecastsUpdated }, 'Amazon forecast import success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.amazonForecast })
      await updateReportSuccess(report.id, {
        created: createdRows,
        updated: updatedRows,
        deleted: deletedRows,
        rejected: excluded,
        identical: identicalRows,
      })

      return c.json({
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
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      logger.error({ err }, 'Amazon forecast import error')
      await sendSlackNotification({
        error: { message: err.message ?? 'Unknown error', code: err.code },
        context: SLACK_CONTEXT.amazonForecast,
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /forecast/reports/amazon — List import reports for Amazon forecasts
   */
  .get('/reports/amazon', tokenIsValid, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType(REPORT_TYPE_AMAZON_FORECAST, page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })
