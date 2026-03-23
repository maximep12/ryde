import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-parkland/$reportId')({
  component: ImportSellOutParklandReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellOutParklandReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
