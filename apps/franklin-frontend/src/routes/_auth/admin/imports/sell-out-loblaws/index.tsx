'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-loblaws/')({
  component: ImportSellOutLoblawsPage,
  staticData: {
    title: 'route.importSellOutLoblaws',
    crumb: 'route.importSellOutLoblaws',
  },
})

const EXPECTED_COLUMNS = ['Week End Date', 'UPC', 'Site Number', 'Sales', 'Units']

function ImportSellOutLoblawsPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Loblaws Sell-Out"
      description="Upload the Loblaws sell-out CSV file"
      uploadEndpoint="/banners/loblaws"
      reportsEndpoint="/banners/reports/loblaws"
      expectedColumns={EXPECTED_COLUMNS}
      unit="rows"
      uploadType="sell-out-loblaws"
      accept={['.csv']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-loblaws/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
