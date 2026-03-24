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

const EXPECTED_COLUMNS = [
  'Site',
  'Name',
  'Fiscal Week',
  'Article',
  'SKU',
  'Net contents',
  'UNITS',
  'GSR',
  'Banner2',
  'Region',
  'Week Ending',
  'ERP',
  'Owner',
  'Province',
  'BAM',
  'TM',
]

function ImportSellOutSobeysPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Sobeys Sell-Out"
      description="Upload the Sobeys sell-out Excel file (DATA sheet)"
      uploadEndpoint="/banners/sobeys"
      reportsEndpoint="/banners/reports/sobeys"
      expectedColumns={EXPECTED_COLUMNS}
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
