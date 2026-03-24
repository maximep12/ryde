'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-rabba/')({
  component: ImportSellOutRabbaPage,
  staticData: {
    title: 'route.importSellOutRabba',
    crumb: 'route.importSellOutRabba',
  },
})

const EXPECTED_COLUMNS = [
  'WEEKEND',
  'STORE#',
  'STOREADDR',
  'STORECITY',
  'BRAND',
  'UPC',
  'UNITS',
  'SALESQTY',
  'SALESAMT',
]

function ImportSellOutRabbaPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Rabba Sell-Out"
      description="Upload the weekly Rabba sell-out CSV file"
      uploadEndpoint="/banners/rabba"
      reportsEndpoint="/banners/reports/rabba"
      expectedColumns={EXPECTED_COLUMNS}
      unit="rows"
      uploadType="sell-out-rabba"
      accept={['.csv']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-rabba/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
