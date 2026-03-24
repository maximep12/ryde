import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-circle-k-qcatl/$reportId')({
  component: ImportSellOutCircleKQcAtlReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellOutCircleKQcAtlReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
