import { ImportReportDetail } from '@/components/ImportPage/ReportDetail'
import { createFileRoute, useLocation } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-petro-canada/$reportId')({
  component: ImportSellOutPetroCanadaReportPage,
  staticData: {
    title: 'route.importReportDetail',
    crumb: 'route.importReportDetail',
  },
})

function ImportSellOutPetroCanadaReportPage() {
  const location = useLocation()
  return <ImportReportDetail report={location.state?.report} />
}
