import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-in-orders/$reportId')({
  component: ImportSellInOrdersReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellInOrdersReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
