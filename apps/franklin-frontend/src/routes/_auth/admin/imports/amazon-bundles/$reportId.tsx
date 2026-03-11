import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/amazon-bundles/$reportId')({
  component: ImportAmazonBundlesReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportAmazonBundlesReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
