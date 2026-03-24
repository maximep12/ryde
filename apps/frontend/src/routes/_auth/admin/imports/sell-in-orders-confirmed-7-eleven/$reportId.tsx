import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_auth/admin/imports/sell-in-orders-confirmed-7-eleven/$reportId',
)({
  component: ImportSellInOrdersConfirmed7ElevenReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellInOrdersConfirmed7ElevenReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
