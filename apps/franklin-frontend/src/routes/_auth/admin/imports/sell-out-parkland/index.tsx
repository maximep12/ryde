'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-parkland/')({
  component: ImportSellOutParklandPage,
  staticData: {
    title: 'route.importSellOutParkland',
    crumb: 'route.importSellOutParkland',
  },
})

function ImportSellOutParklandPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Parkland Sell-Out"
      description="Upload the Parkland sell-out Excel file"
      uploadEndpoint="/banners/parkland"
      reportsEndpoint="/banners/reports/parkland"
      expectedColumns={[]}
      unit="rows"
      uploadType="sell-out-parkland"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-parkland/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
