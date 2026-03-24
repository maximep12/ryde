import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-rabba/$reportId')({
  component: ImportSellOutRabbaReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellOutRabbaReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
