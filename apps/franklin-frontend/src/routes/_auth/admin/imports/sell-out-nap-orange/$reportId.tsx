import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-nap-orange/$reportId')({
  component: ImportSellOutNapOrangeReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellOutNapOrangeReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
