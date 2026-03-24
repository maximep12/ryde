import Promise from 'bluebird'
import moment from 'moment'

import chunk from 'lodash/chunk'
import groupBy from 'lodash/groupBy'
import isEmpty from 'lodash/isEmpty'
import isUndefined from 'lodash/isUndefined'
import trim from 'lodash/trim'

import Customer from 'models/customer'
import CustomerTarget from 'models/customerTarget'
import Period from 'models/period'
import Report from 'models/report'

import { ERRORS, REPORTS, UPLOAD_RESULT_STATES } from 'utils/constants'

import { readExcelFile } from 'lib/FileParser/excel'
import { sendSlackNotification, SLACK_CONTEXT } from 'lib/slack'
import pg from 'pg'
import { parse as parseConnectionString } from 'pg-connection-string'

export async function updateCustomerSchema(ctx) {
  console.log('[REPORT] - Customers start')
  const startTime = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', '')

  const newReport = await Report.query().insert({
    type: REPORTS.customers,
    reportStart: startTime,
    fileName,
    notifSent: true,
  })

  try {
    const contentBySheet = await readExcelFile({
      stream: ctx.req,
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
      optional: ['BAT ERP'],
    })

    const { values } = contentBySheet.find((cbs) => cbs.sheetName === 'Data')

    const allCustomers = await Customer.query().select()

    let created = 0
    let updated = 0
    let identical = 0

    await Promise.map(values, async (row) => {
      const {
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
        region,
        district,
        territory,
        batErp,
        cluster = null,
        distributionCenter,
      } = row

      const formattedId = Number(id)
      const distribCenter = distributionCenter && !isEmpty(distributionCenter) ? distributionCenter : null

      const linkedCustomer = allCustomers.find((c) => Number(c.id) === formattedId)

      const bannerStoreId = isUndefined(bannerInternalId) ? null : bannerInternalId
      const storeIsActive = status === 'Active'

      const batId = ['', 'N/A', 'TBC'].includes(batErp) ? null : Number(batErp)

      if (linkedCustomer) {
        const valuesToValidate = [
          { name: 'name', existing: linkedCustomer.name, new: name },
          { name: 'country', existing: linkedCustomer.country, new: country },
          { name: 'state', existing: linkedCustomer.state, new: state },
          { name: 'area', existing: linkedCustomer.area, new: area },
          { name: 'banner', existing: linkedCustomer.banner, new: banner },
          { name: 'channel', existing: linkedCustomer.channel, new: channel },
          { name: 'subChannel', existing: linkedCustomer.subChannel, new: subChannel },
          { name: 'bannerInternalId', existing: linkedCustomer.bannerInternalId, new: bannerStoreId },
          { name: 'isActive', existing: linkedCustomer.isActive, new: storeIsActive },
          { name: 'phase', existing: linkedCustomer.phase, new: phase },
          { name: 'territory', existing: linkedCustomer.territory, new: territory },
          { name: 'cluster', existing: linkedCustomer.cluster, new: cluster },
          { name: 'distributionCenter', existing: linkedCustomer.distributionCenter, new: distribCenter },
          { name: 'batId', existing: linkedCustomer.batId, new: batId },
        ].filter((v) => v.existing !== v.new)

        if (valuesToValidate.length) {
          updated++

          await Customer.query()
            .update({
              name,
              country,
              state,
              area,
              banner,
              channel,
              subChannel,
              bannerInternalId: bannerStoreId,
              isActive: storeIsActive,
              phase,
              region,
              district,
              territory,
              cluster,
              distributionCenter: distribCenter,
              batId,
            })
            .where('id', formattedId)
        } else {
          identical++
        }
      } else {
        created++
        await Customer.query().insert({
          id: formattedId,
          name,
          country,
          state,
          area,
          banner,
          channel,
          subChannel,
          bannerInternalId: bannerStoreId,
          isActive: storeIsActive,
          phase,
          cluster,
          distributionCenter: distribCenter,
          region,
          district,
          territory,
          batId,
        })
      }
    })

    await syncCustomersLocation()

    console.log('[REPORT] - Customers success')

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.customers })
    await Report.query()
      .update({
        reportEnd: moment().format(),
        created,
        updated,
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
      result: { created, updated, unit: 'customers', status: UPLOAD_RESULT_STATES.success },
      rows: {
        received: values.length,
        rejected: 0,
        created,
        updated,
        deleted: 0,
        identical,
      },
    }
  } catch (error) {
    console.log('[REPORT] - Customers error: ', error)

    const { message, code } = error

    await sendSlackNotification({ context: SLACK_CONTEXT.customers, error })
    await Report.query()
      .update({
        failure: message,
        reportEnd: moment().format(),
        notifSent: true,
      })
      .where('id', newReport.id)

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Customers end')
  }
}

export async function updateCustomerTargets(ctx) {
  console.log('[REPORT] - Customers targets start')
  const startTime = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', '')

  const newReport = await Report.query().insert({
    type: REPORTS.customersTargets,
    reportStart: startTime,
    fileName,
    notifSent: true,
  })

  try {
    const contentBySheet = await readExcelFile({
      stream: ctx.req,
      expected: [
        {
          sheetName: 'Data',
          columns: ['Id', 'Target', 'Period Name', 'Start Date', 'End Date'],
        },
      ],
    })

    const { values } = contentBySheet.find((cbs) => cbs.sheetName === 'Data')

    const allCustomers = await Customer.query().select()
    const periods = await Period.query().select()
    const allPeriods = periods.map((p) => ({
      ...p,
      startDate: moment(p.startDate).format('YYYY-MM-DD'),
      endDate: moment(p.endDate).format('YYYY-MM-DD'),
    }))

    let created = 0
    let updated = 0
    let identical = 0

    const { validRows, rejectedRows } = values.reduce(
      (acc, { row, id, target, periodName, startDate, endDate }) => {
        const formattedId = Number(id)
        const linkedCustomer = allCustomers.find((c) => Number(c.id) === formattedId)
        if (!linkedCustomer) {
          return { ...acc, rejectedRows: [...acc.rejectedRows, ERRORS.invalidERP(row, id)] }
        }

        if (isNaN(target)) {
          return { ...acc, rejectedRows: [...acc.rejectedRows, ERRORS.invalidQuantity(row, target)] }
        }

        if (trim(periodName).length === 0) {
          return { ...acc, rejectedRows: [...acc.rejectedRows, ERRORS.missingValue(row, 'Period Name')] }
        }

        if (trim(startDate).length === 0) {
          return { ...acc, rejectedRows: [...acc.rejectedRows, ERRORS.missingValue(row, 'Start Date')] }
        }

        if (trim(endDate).length === 0) {
          return { ...acc, rejectedRows: [...acc.rejectedRows, ERRORS.missingValue(row, 'End Date')] }
        }

        const formattedStartDate = moment.utc(startDate).format('YYYY-MM-DD')
        const formattedEndDate = moment.utc(endDate).format('YYYY-MM-DD')

        console.log({ formattedStartDate, startDate })

        return {
          rejectedRows: acc.rejectedRows,
          validRows: [
            ...acc.validRows,
            {
              id,
              target: Math.round(target),
              periodName,
              startDate: formattedStartDate,
              endDate: formattedEndDate,
            },
          ],
        }
      },
      { validRows: [], rejectedRows: [] },
    )

    for (const { id, target, periodName, startDate, endDate } of validRows) {
      let currentPeriod = allPeriods.find(
        (period) => period.name === periodName && period.startDate === startDate && period.endDate === endDate,
      )

      if (!currentPeriod) {
        const newPeriod = await Period.query().insert({ name: periodName, startDate, endDate })
        allPeriods.push(newPeriod)
        currentPeriod = newPeriod
      }

      if (!currentPeriod.targets) {
        const currentPeriodWithTargets = await Period.query()
          .select()
          .findById(currentPeriod.id)
          .withGraphFetched('targets')
        currentPeriod.targets = currentPeriodWithTargets.targets
      }

      const targetAlreadyExists = currentPeriod.targets.find((t) => t.customerId === id)
      if (targetAlreadyExists) {
        if (target !== targetAlreadyExists.target) {
          await CustomerTarget.query()
            .update({ target })
            .where('customer_id', id)
            .andWhere('period_id', currentPeriod.id)
          updated++
        } else {
          identical++
        }
      } else {
        await CustomerTarget.query().insert({ customer_id: id, target, period_id: currentPeriod.id })
        created++
      }
    }

    console.log('[REPORT] - Customers targets success')

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.customersTargets })
    await Report.query()
      .update({
        reportEnd: moment().format(),
        created: 0,
        updated,
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
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
    }
  } catch (error) {
    console.log('[REPORT] - Customers targets error: ', error)

    const { message, code } = error

    await sendSlackNotification({ context: SLACK_CONTEXT.customersTargets, error })
    await Report.query()
      .update({
        failure: message,
        reportEnd: moment().format(),
        notifSent: true,
      })
      .where('id', newReport.id)

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Customers targets end')
  }
}

export async function syncCustomersLocation() {
  console.log('[ADVANCE SYNC] - Sync Start')
  const advancePool = new pg.Pool(parseConnectionString(process.env.ADVANCE_DATABASE_URL))

  try {
    const client = await advancePool.connect()

    const allCustomers = await Customer.query()
      .select([
        'bat_id',
        'advance_region_id',
        'advance_region_name',
        'advance_district_id',
        'advance_district_name',
        'advance_territory_id',
        'advance_territory_name',
      ])
      .whereNotNull('bat_id')

    try {
      // Example query - modify as needed
      const { rows: advanceCustomers } = await client.query(`
        SELECT 
            customer_id as "customerId",
            region_name as "regionName",
            region_id as "regionId",
            district_name as "districtName",
            district_id as "districtId",
            territory_name as "territoryName",
            territory_id as "territoryId" 
          from customer_primary_assignments
          where customer_id in (${allCustomers.map((c) => c.batId).join()});`)

      const rydeCustomers = groupBy(allCustomers, 'batId')

      // Filter to only customers that actually need updating
      const updates = advanceCustomers.filter(
        ({ customerId, regionName, regionId, districtName, districtId, territoryName, territoryId }) => {
          const linkedCustomer = rydeCustomers[customerId]?.[0]
          return (
            linkedCustomer &&
            (regionName !== linkedCustomer.advanceRegionName ||
              regionId !== linkedCustomer.advanceRegionId ||
              districtName !== linkedCustomer.advanceDistrictName ||
              districtId !== linkedCustomer.advanceDistrictId ||
              territoryName !== linkedCustomer.advanceTerritoryName ||
              territoryId !== linkedCustomer.advanceTerritoryId)
          )
        },
      )

      const customersToUpdate = chunk(updates, 1000)

      // Batch update using a single query with VALUES join
      let updatedCount = 0
      await Promise.map(
        customersToUpdate,
        async (batch) => {
          const fieldsToValidate = [
            { field: 'customerId', column: 'customer_id', type: 'int' },
            { field: 'regionName', column: 'region_name', type: 'text' },
            { field: 'regionId', column: 'region_id', type: 'text' },
            { field: 'districtName', column: 'district_name', type: 'text' },
            { field: 'districtId', column: 'district_id', type: 'text' },
            { field: 'territoryName', column: 'territory_name', type: 'text' },
            { field: 'territoryId', column: 'territory_id', type: 'text' },
          ]

          const { setClauses, castClauses, fieldKeys, columnKeys } = fieldsToValidate.reduce(
            (acc, { field, column, type }, i) => {
              if (i > 0) acc.setClauses.push(`advance_${column} = v.${column}`)
              acc.castClauses.push(`?::${type}`)
              acc.fieldKeys.push(field)
              acc.columnKeys.push(column)
              return acc
            },
            { setClauses: [], castClauses: [], fieldKeys: [], columnKeys: [] },
          )
          const setClause = setClauses.join(', ')
          const rowPlaceholder = `(${castClauses.join(', ')})`
          const valuesClause = batch.map(() => rowPlaceholder).join(', ')
          const bindings = batch.flatMap((row) => fieldKeys.map((f) => row[f]))

          await Customer.knex().raw(
            `UPDATE customers SET ${setClause}
             FROM (VALUES ${valuesClause}) AS v(${columnKeys.join(', ')})
             WHERE customers.bat_id = v.customer_id`,
            bindings,
          )

          updatedCount += batch.length
        },
        { concurrency: 5 },
      )

      console.log(`[ADVANCE SYNC] - Updated ${updatedCount} customers`)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('[ADVANCE SYNC] - Error:', error.message)
    throw error
  } finally {
    await advancePool.end()
  }
}
