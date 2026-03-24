'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-central-market/')({
  component: ImportSellOutCentralMarketPage,
  staticData: {
    title: 'route.importSellOutCentralMarket',
    crumb: 'route.importSellOutCentralMarket',
  },
})

const EXPECTED_COLUMNS = ['SKU', 'ID', 'Quantity', 'Net Value', 'Date']

function ImportSellOutCentralMarketPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Central Market Sell-Out"
      description="Upload the Central Market sell-out Excel file (Data sheet)"
      uploadEndpoint="/banners/centralMarket"
      reportsEndpoint="/banners/reports/centralMarket"
      expectedColumns={EXPECTED_COLUMNS}
      unit="rows"
      uploadType="sell-out-central-market"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-central-market/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
