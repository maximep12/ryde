import isEqual from 'lodash/isEqual'

import CompetitorSale from 'models/competitorSale'
import Customer from 'models/customer'
import DataImport from 'models/dataImports'

import { refreshCustomerVelocity } from 'models/customerVelocity'

import { BANNERS, DATES, ERRORS } from 'utils/constants'

export async function importRabbaCompetitorsSales(ctx) {
  ctx.throw(501, 'Rabba competitor sales import endpoint not yet implemented')
}

export async function saveCompetitorsSalesCircleKData({ data }) {
  const customers = await Customer.query().select().whereIn('banner', Object.values(BANNERS.CIRCLE_K))

  const rejected = []

  const startOfLastWeek = DATES.mondayOfPreviousWeek().format('YYYY-MM-DD')
  const endOfLastWeek = DATES.sundayOfPreviousWeek().format('YYYY-MM-DD')

  const competitorData = await DataImport.query()
    .withGraphFetched('competitorSales')
    .where('period_start', startOfLastWeek)
    .andWhere('period_end', endOfLastWeek)
    .andWhere('file_origin', BANNERS.CIRCLE_K.global)
    .first()

  for (const dataRow of data) {
    const { row, address, city, siteNumber, rydeUnits, rydeSales, competitorsUnits, competitorsSales } = dataRow

    const activeCustomer = customers.find((customer) => Number(customer.bannerInternalId) === Number(siteNumber))

    if (!activeCustomer) {
      rejected.push(ERRORS.invalidSiteNumber(row, siteNumber))
      continue
    }

    const customerAddress = { address, city }

    if (!isEqual(activeCustomer.address, customerAddress)) {
      await Customer.query().update({ address: customerAddress }).where({ id: activeCustomer.id })
    }

    const data = {
      rydeUnits,
      rydeValue: Number(rydeUnits) === 0 ? 0 : rydeSales,
      romUnits: competitorsUnits,
      romValue: Number(competitorsUnits) === 0 ? 0 : competitorsSales,
      customerId: activeCustomer.id,
      fileImport: competitorData?.id,
    }

    const linkedData = competitorData?.competitorSales.find((cd) => cd.customerId === activeCustomer.id)

    if (linkedData) {
      await CompetitorSale.query().patch(data).findById(linkedData.id)
    } else {
      await CompetitorSale.query().insert(data)
    }
  }

  await refreshCustomerVelocity()

  const competitorRow = await DataImport.query()
    .withGraphFetched('competitorSales')
    .where('period_start', startOfLastWeek)
    .andWhere('period_end', endOfLastWeek)
    .first()

  return { created: competitorRow.competitorSales.length, rejected }
}
