import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/amazon-orders/$reportId')({
  component: ImportAmazonOrdersReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportAmazonOrdersReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
