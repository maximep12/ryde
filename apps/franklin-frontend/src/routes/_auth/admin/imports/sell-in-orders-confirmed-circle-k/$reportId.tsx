import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_auth/admin/imports/sell-in-orders-confirmed-circle-k/$reportId',
)({
  component: ImportSellInOrdersConfirmedCircleKReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellInOrdersConfirmedCircleKReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
