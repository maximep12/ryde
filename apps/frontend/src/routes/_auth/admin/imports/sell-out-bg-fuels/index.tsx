'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-bg-fuels/')({
  component: ImportSellOutBgFuelsPage,
  staticData: {
    title: 'route.importSellOutBgFuels',
    crumb: 'route.importSellOutBgFuels',
  },
})

const EXPECTED_COLUMNS = [
  'Date',
  'Banner ID',
  'Address',
  'City',
  'Province',
  'Postal Code',
  'Description',
  'UPC',
  'Sales Amount',
  'Sales Units',
]

function ImportSellOutBgFuelsPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="BG Fuels Sell-Out"
      description="Upload the BG Fuels sell-out pipe-delimited file"
      uploadEndpoint="/banners/bgFuels"
      reportsEndpoint="/banners/reports/bgFuels"
      expectedColumns={EXPECTED_COLUMNS}
      unit="rows"
      uploadType="sell-out-bg-fuels"
      accept={['.csv', '.txt']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-bg-fuels/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
