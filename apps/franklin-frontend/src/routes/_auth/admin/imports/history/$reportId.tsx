import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { useImportReport } from '@/hooks/queries/imports/useImportReports'
import { createFileRoute, useLocation } from '@tanstack/react-router'
import { LoaderIcon } from 'lucide-react'

export const Route = createFileRoute('/_auth/admin/imports/history/$reportId')({
  component: HistoryReportDetailPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function HistoryReportDetailPage() {
  const { reportId } = Route.useParams()
  const location = useLocation()

  // Use report from router state if available (navigated from history table),
  // otherwise fetch it by ID (direct URL access)
  const stateReport = location.state?.report
  const { data: fetchedReport, isLoading } = useImportReport(Number(reportId))

  const report = stateReport ?? fetchedReport

  if (isLoading && !report) {
    return (
      <div className="flex justify-center py-16">
        <LoaderIcon className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  return <ImportReportDetail report={report} />
}
