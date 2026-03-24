'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-circle-k-qcatl/')({
  component: ImportSellOutCircleKQcAtlPage,
  staticData: {
    title: 'route.importSellOutCircleKQcAtl',
    crumb: 'route.importSellOutCircleKQcAtl',
  },
})

function ImportSellOutCircleKQcAtlPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Circle K QC+ATL Sell-Out"
      description="Upload the weekly Circle K QC+ATL sell-out Excel file"
      uploadEndpoint="/banners/circleK/qcatl"
      reportsEndpoint="/banners/reports/circleK/qcatl"
      expectedColumns={['ERP', 'Item Description', 'DATE', 'VENTES']}
      unit="rows"
      uploadType="sell-out-circle-k-qcatl"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-circle-k-qcatl/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
