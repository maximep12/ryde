'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-sobeys/')({
  component: ImportSellOutSobeysPage,
  staticData: {
    title: 'route.importSellOutSobeys',
    crumb: 'route.importSellOutSobeys',
  },
})

function ImportSellOutSobeysPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Sobeys Sell-Out"
      description="Upload the Sobeys sell-out Excel file"
      uploadEndpoint="/banners/sobeys"
      reportsEndpoint="/banners/reports/sobeys"
      expectedColumns={[]}
      unit="rows"
      uploadType="sell-out-sobeys"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-sobeys/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
