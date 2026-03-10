import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createBaseLogger } from '@repo/logger'
import { ContextVariables } from '../../index'
import { readExcelFile } from '../../lib/FileParser/excel'
import { sendSlackNotification, SLACK_CONTEXT } from '../../lib/slack'
import { requireRoles } from '../../middlewares/auth'
import { ERRORS, UPLOAD_RESULT_STATES } from '../../utils/constants.js'

const customersLogger = createBaseLogger().child({ module: 'customers' })
const targetsLogger = createBaseLogger().child({ module: 'customers-targets' })
import {
  bulkUpsertCustomerTargets,
  bulkUpsertCustomers,
  createReport,
  findOrCreatePeriod,
  getAllCustomers,
  getReportsByType,
  getTargetsForPeriod,
  syncCustomersLocation,
  updateReportFailure,
  updateReportSuccess,
} from './helpers'

const canUploadCustomers = requireRoles('admin', 'data_manager')

const customersRouter = new Hono<{ Variables: ContextVariables }>()

export const customersRouterDefinition = customersRouter

  /**
   * POST /customers — Upload customer master data (Excel)
   */
  .post('/', canUploadCustomers, async (c) => {
    customersLogger.info('Customers report start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '')
    const report = await createReport('CUSTOMERS', fileName)

    try {
      const stream = c.req.raw.body
      if (!stream) throw new HTTPException(400, { message: 'Missing file body' })

      const contentBySheet = await readExcelFile({
        stream: stream as unknown as NodeJS.ReadableStream,
        expected: [
          {
            sheetName: 'Data',
            columns: [
              'Id',
              'Name',
              'Country',
              'State',
              'Area',
              'Channel',
              'Sub-Channel',
              'Banner',
              'Banner Internal ID',
              'Status',
              'Territory',
              'Phase',
              'Cluster',
              'Distribution Center',
            ],
          },
        ],
        optional: [{ sheetName: 'Data', columns: ['BAT ERP'] }],
      })

      const dataSheet = contentBySheet.find((s) => s.sheetName === 'Data')
      if (!dataSheet) throw new HTTPException(406, { message: 'Missing Data sheet' })
      const { values } = dataSheet
      const allCustomers = await getAllCustomers()

      let created = 0
      let updated = 0
      let identical = 0
      const rejectedRows: string[] = []

      type ParsedRow = {
        id: number
        name: string
        country: string
        state: string
        area: string
        banner: string
        channel: string
        subChannel: string
        bannerInternalId: string | null
        isActive: boolean
        phase: string
        territory: string
        cluster: string | null
        distributionCenter: number | null
        batId: number | null
      }

      const { withoutDistCenter, withDistCenter } = values.reduce<{
        withoutDistCenter: ParsedRow[]
        withDistCenter: ParsedRow[]
      }>(
        (acc, row) => {
          const {
            rowNumber,
            name,
            id,
            channel,
            subChannel,
            bannerInternalId,
            status,
            banner,
            phase,
            country,
            state,
            area,
            territory,
            batErp,
            cluster = null,
            distributionCenter,
          } = row as Record<string, unknown>

          if (!id) {
            rejectedRows.push(ERRORS.custom(rowNumber, 'Missing ID'))
            return acc
          }

          const parsed: ParsedRow = {
            id: Number(id),
            name: String(name),
            country: String(country),
            state: String(state),
            area: String(area),
            banner: String(banner),
            channel: String(channel),
            subChannel: String(subChannel),
            bannerInternalId:
              bannerInternalId === undefined || bannerInternalId === null ? null : String(bannerInternalId),
            isActive: status === 'Active',
            phase: String(phase),
            territory: String(territory),
            cluster: cluster ? String(cluster) : null,
            distributionCenter:
              distributionCenter && String(distributionCenter).trim() !== '' ? Number(distributionCenter) : null,
            batId: !batErp || ['', 'N/A', 'TBC'].includes(String(batErp)) ? null : Number(batErp),
          }

          if (parsed.distributionCenter === null) acc.withoutDistCenter.push(parsed)
          else acc.withDistCenter.push(parsed)

          return acc
        },
        { withoutDistCenter: [] as ParsedRow[], withDistCenter: [] as ParsedRow[] },
      )

      const existingMap = new Map(allCustomers.map((c) => [Number(c.id), c]))

      function countStats(rows: ParsedRow[]) {
        for (const row of rows) {
          const existing = existingMap.get(row.id)
          if (!existing) {
            created++
            existingMap.set(row.id, row as (typeof allCustomers)[0])
          } else {
            const { id: _id, ...newValues } = row
            const hasChanges = (Object.entries(newValues) as [keyof typeof newValues, unknown][]).some(
              ([key, val]) => existing[key as keyof typeof existing] !== val,
            )
            if (hasChanges) updated++
            else identical++
          }
        }
      }

      countStats([...withoutDistCenter, ...withDistCenter])

      if (withoutDistCenter.length > 0) await bulkUpsertCustomers(withoutDistCenter)
      if (withDistCenter.length > 0) await bulkUpsertCustomers(withDistCenter)

      await syncCustomersLocation()

      customersLogger.info('Customers report success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.customers })
      await updateReportSuccess(report.id, { created, updated, rejected: rejectedRows, identical })

      return c.json({
        result: {
          created,
          updated,
          rejected: rejectedRows,
          unit: 'customers',
          status: rejectedRows.length > 0 ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: { received: values.length, rejected: rejectedRows.length, created, updated, deleted: 0, identical },
        warnings: rejectedRows,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      customersLogger.error({ err }, 'Customers report error')
      await sendSlackNotification({
        context: SLACK_CONTEXT.customers,
        error: { message: err.message ?? 'Unknown error', code: err.code },
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * POST /customers/targets — Upload customer sales targets (Excel)
   */
  .post('/targets', canUploadCustomers, async (c) => {
    targetsLogger.info('Customers targets report start')
    const fileName = (c.req.header('content-disposition') ?? '').replace('filename=', '')
    const report = await createReport('CUSTOMERS_TARGETS', fileName)

    try {
      const stream = c.req.raw.body
      if (!stream) throw new HTTPException(400, { message: 'Missing file body' })

      const contentBySheet = await readExcelFile({
        stream: stream as unknown as NodeJS.ReadableStream,
        expected: [
          {
            sheetName: 'Data',
            columns: ['Id', 'Target', 'Period Name', 'Start Date', 'End Date'],
          },
        ],
      })

      const dataSheet = contentBySheet.find((s) => s.sheetName === 'Data')
      if (!dataSheet) throw new HTTPException(406, { message: 'Missing Data sheet' })
      const { values } = dataSheet
      const allCustomers = await getAllCustomers()
      const customerIdSet = new Set(allCustomers.map((c) => Number(c.id)))

      let created = 0
      let updated = 0
      let identical = 0
      const rejectedRows: string[] = []

      // Validate rows up front
      type ValidRow = {
        id: number
        target: number
        periodName: string
        startDate: string
        endDate: string
      }
      const validRows: ValidRow[] = []

      for (const row of values) {
        const { rowNumber, id, target, periodName, startDate, endDate } = row as Record<string, unknown>
        const formattedId = Number(id)

        if (!customerIdSet.has(formattedId)) {
          rejectedRows.push(ERRORS.custom(rowNumber, `Invalid customer ID: ${id}`))
          continue
        }

        if (isNaN(Number(target))) {
          rejectedRows.push(ERRORS.invalidQuantity(rowNumber, target))
          continue
        }

        if (!periodName || String(periodName).trim().length === 0) {
          rejectedRows.push(ERRORS.missingValue(rowNumber, 'Period Name'))
          continue
        }

        if (!startDate || String(startDate).trim().length === 0) {
          rejectedRows.push(ERRORS.missingValue(rowNumber, 'Start Date'))
          continue
        }

        if (!endDate || String(endDate).trim().length === 0) {
          rejectedRows.push(ERRORS.missingValue(rowNumber, 'End Date'))
          continue
        }

        validRows.push({
          id: formattedId,
          target: Math.round(Number(target)),
          periodName: String(periodName),
          startDate: new Date(String(startDate)).toISOString().split('T')[0] ?? '',
          endDate: new Date(String(endDate)).toISOString().split('T')[0] ?? '',
        })
      }

      // Build period cache — sequential to avoid race conditions on insert
      const periodCache = new Map<string, Awaited<ReturnType<typeof findOrCreatePeriod>>>()
      for (const { periodName, startDate, endDate } of validRows) {
        const key = `${periodName}|${startDate}|${endDate}`
        if (!periodCache.has(key)) {
          periodCache.set(key, await findOrCreatePeriod(periodName, startDate, endDate))
        }
      }

      // Fetch all targets for unique periods in parallel
      const uniquePeriodIds = [...new Set([...periodCache.values()].map((p) => p.id))]
      const allTargets = (await Promise.all(uniquePeriodIds.map(getTargetsForPeriod))).flat()

      // Build Map: periodId -> customerId -> existing target value
      const periodTargetsMap = new Map<number, Map<number, number>>()
      for (const t of allTargets) {
        if (!periodTargetsMap.has(t.periodId)) periodTargetsMap.set(t.periodId, new Map())
        periodTargetsMap.get(t.periodId)!.set(Number(t.customerId), t.target)
      }

      // Classify rows and count stats
      const toUpsert: { customerId: number; periodId: number; target: number }[] = []
      for (const { id, target, periodName, startDate, endDate } of validRows) {
        const period = periodCache.get(`${periodName}|${startDate}|${endDate}`)!
        const existingTarget = periodTargetsMap.get(period.id)?.get(id)

        if (existingTarget === undefined) {
          toUpsert.push({ customerId: id, periodId: period.id, target })
          created++
        } else if (target !== existingTarget) {
          toUpsert.push({ customerId: id, periodId: period.id, target })
          updated++
        } else {
          identical++
        }
      }

      if (toUpsert.length > 0) await bulkUpsertCustomerTargets(toUpsert)

      targetsLogger.info('Customers targets report success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.customersTargets })
      await updateReportSuccess(report.id, { created, updated, rejected: rejectedRows, identical })

      return c.json({
        result: {
          created,
          rejected: rejectedRows,
          updated,
          unit: 'customers targets',
          status: UPLOAD_RESULT_STATES.success,
        },
        rows: {
          created,
          received: values.length,
          rejected: rejectedRows.length,
          updated,
          deleted: 0,
          identical,
        },
        warnings: rejectedRows,
      })
    } catch (error) {
      const err = error as { message?: string; code?: number }
      targetsLogger.error({ err }, 'Customers targets report error')
      await sendSlackNotification({
        context: SLACK_CONTEXT.customersTargets,
        error: { message: err.message ?? 'Unknown error', code: err.code },
      })
      await updateReportFailure(report.id, err.message ?? 'Unknown error')
      const status = (err.code ?? 400) as 400 | 406 | 500
      throw new HTTPException(status, { message: err.message ?? 'Upload failed' })
    }
  })

  /**
   * GET /customers/reports — List import reports for customers
   */
  .get('/reports', canUploadCustomers, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType('CUSTOMERS', page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })

  /**
   * GET /customers/targets/reports — List import reports for sell-in targets
   */
  .get('/targets/reports', canUploadCustomers, async (c) => {
    const page = Math.max(1, Number(c.req.query('page') ?? 1))
    const pageSize = Math.min(50, Math.max(1, Number(c.req.query('pageSize') ?? 10)))
    const { rows, total } = await getReportsByType('CUSTOMERS_TARGETS', page, pageSize)
    return c.json({
      reports: rows,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  })
