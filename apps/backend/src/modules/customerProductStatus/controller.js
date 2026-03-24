import { readExcelFile } from 'lib/FileParser/excel'
import { sendSlackNotification, SLACK_CONTEXT } from 'lib/slack'

import Customer from 'models/customer'
import CustomerProductStatus from 'models/customerStatus'
import Report from 'models/report'
import moment from 'moment'

import { UPLOAD_RESULT_STATES, REPORTS, ERRORS } from 'utils/constants'

export async function importCustomerProductsStatus(ctx) {
  console.log('[REPORT] - Customer Products Status start')
  const startTime = moment().format()
  const fileName = ctx.request.header['content-disposition']?.replace('filename=', '') || 'unknown'

  const newReport = await Report.query().insert({
    type: REPORTS.customerProductStatus,
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
          columns: ['ID', 'Date', 'Placements', 'Facings'],
        },
      ],
    })

    const { values } = contentBySheet.find((cbs) => cbs.sheetName === 'Data')
    const existingCustomers = await Customer.query().select('id')

    const excluded = []
    const customerStatuses = values.reduce((acc, it) => {
      const { row, id, date, facings, placements } = it

      const linkedCustomer = existingCustomers.find((customer) => customer.id === id)
      if (!linkedCustomer) {
        excluded.push(ERRORS.invalidERP(row, id))
        return acc
      }

      if (facings !== null && isNaN(Number(facings))) {
        excluded.push(ERRORS.custom(row, `Facings must be a number. Received ${facings}`))
        return acc
      }

      if (placements !== null && isNaN(Number(placements))) {
        excluded.push(ERRORS.custom(row, `Placements must be a number. Received ${placements}`))
        return acc
      }

      return [
        ...acc,
        {
          customerId: id,
          statusDate: moment.utc(date).format('YYYY-MM-DD'),
          facings: Number(facings),
          placements: Number(placements),
        },
      ]
    }, [])

    let createdRows = 0
    let updatedRows = 0
    let identicalRows = 0

    const oldStatuses = await CustomerProductStatus.query().select()
    const existingStatuses = oldStatuses.map((status) => ({
      ...status,
      statusDate: moment.utc(status.statusDate).format('YYYY-MM-DD'),
    }))

    for (const customerStatus of customerStatuses) {
      const { customerId, statusDate, facings, placements } = customerStatus
      const rowAlreadyExists = existingStatuses.find(
        (status) => status.customerId === customerId && status.statusDate === statusDate,
      )

      if (rowAlreadyExists) {
        const statusesAreTheSame = rowAlreadyExists.facings === facings && rowAlreadyExists.placements === placements
        if (statusesAreTheSame) {
          identicalRows++
        } else {
          await CustomerProductStatus.query()
            .update({ placements, facings })
            .where('customer_id', customerId)
            .andWhere('status_date', statusDate)
          updatedRows++
        }
      } else {
        await CustomerProductStatus.query().insert({
          customer_id: customerId,
          status_date: statusDate,
          facings,
          placements,
        })
        createdRows++
      }
    }

    console.log('[REPORT] - Customer Products Status success')
    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.customerProductStatus })
    await Report.query()
      .update({
        warnings: { rejected: excluded },
        reportEnd: moment().format(),
        created: createdRows,
        updated: updatedRows,
        notifSent: true,
      })
      .where('id', newReport.id)

    ctx.body = {
      result: {
        created: createdRows,
        updated: updatedRows,
        unit: 'Customer Product Statuses',
        status: excluded.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: values.length,
        rejected: excluded.length,
        created: createdRows,
        updated: updatedRows,
        identical: identicalRows,
      },
      warnings: excluded,
    }
  } catch (error) {
    console.log('[REPORT] - Customer Products Status: ', JSON.stringify(error))
    const { message, code } = error

    await sendSlackNotification({
      error,
      context: SLACK_CONTEXT.customerProductStatus,
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
    console.log('[REPORT] - Customer Products Status end')
  }
}
