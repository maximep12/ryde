import moment from 'moment'
import config from 'config'
import jwt from 'jsonwebtoken'

import DataImport from 'models/dataImports'
import Report from 'models/report'
import ReplenOrder from 'models/replenOrder'
import ReplenOrderConfirmed from 'models/replenOrderConfirmed'
import upperCase from 'lodash/upperCase'

import { BANNERS, REPORTS, METABASE_DASHBOARDS } from 'utils/constants'

export async function getImportLatestIncludedDate({ model, date }) {
  const latest = await model.query().select().orderBy(date, 'desc').first()
  return moment.utc(latest.createdAt).subtract(1, 'week').endOf('isoWeek').format('MMM DD')
}

export async function getMetabaseUpdates() {
  const sellInMaxBillingDate = await ReplenOrder.query().select().orderBy('billing_date', 'desc').first()
  const sellIn = moment.utc(sellInMaxBillingDate.billingDate).endOf('isoWeek').format('MMM DD')

  const confirmed = await getImportLatestIncludedDate({ model: ReplenOrderConfirmed, date: 'document_date' })

  const latestCircleKSellout = await DataImport.query()
    .select()
    .where('file_origin', BANNERS.CIRCLE_K.global)
    .orderBy('period_end', 'desc')
    .first()

  const latestRabbaSellout = await DataImport.query()
    .select()
    .where('file_origin', BANNERS.RABBA)
    .orderBy('period_end', 'desc')
    .first()

  const sellOut = {
    [BANNERS.CIRCLE_K.global]: moment(latestCircleKSellout.periodEnd).format('MMM DD'),
    [upperCase(BANNERS.RABBA)]: moment(latestRabbaSellout.periodEnd).format('MMM DD'),
  }

  const latestAmazon = await Report.query().select().where('type', REPORTS.amazon).orderBy('created_at', 'desc').first()
  const amazon = moment.utc(latestAmazon.createdAt).format('MMM DD')
  return { sellIn, confirmed, sellOut, amazon }
}

export function generateMetabaseDashboardLinks({ role }) {
  const metabaseUrl = 'https://ryde-metabase.v7apps.com'
  const metabaseToken = config.metabaseSecretKey

  return Object.entries(METABASE_DASHBOARDS).reduce((acc, [dashboard, infos]) => {
    const payload = {
      resource: { dashboard: infos.dashboardNumber },
      params: {},
    }

    const metabasetoken = jwt.sign(payload, metabaseToken, { expiresIn: '8h' })
    const url = metabaseUrl + '/embed/dashboard/' + metabasetoken + '#bordered=true&titled=true'

    return { ...acc, [dashboard]: url }
  }, {})

  // return Object.entries(METABASE_DASHBOARDS).reduce((acc, [dashboard, infos]) => {
  //   return { ...acc, [dashboard]: metabaseUrl.concat('/public/dashboard/', infos.uuid) }
  // }, {})
}
