'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-circle-k/')({
  component: ImportSellOutCircleKPage,
  staticData: {
    title: 'route.importSellOutCircleK',
    crumb: 'route.importSellOutCircleK',
  },
})

function ImportSellOutCircleKPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Circle K Sell-Out"
      description="Upload the weekly Circle K sell-out Excel file"
      uploadEndpoint="/banners/circleK"
      reportsEndpoint="/banners/reports/circleK"
      expectedColumns={[]}
      unit="rows"
      uploadType="sell-out-circle-k"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-circle-k/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
