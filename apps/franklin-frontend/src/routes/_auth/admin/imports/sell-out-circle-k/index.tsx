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

const EXPECTED_COLUMNS = ['RDO Name', 'Market', 'Site Number', 'Item Numbers (Units/Sales)']

function ImportSellOutCircleKPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Circle K Sell-Out"
      description="Upload the weekly Circle K sell-out Excel file (Fiscal Week sheets)"
      uploadEndpoint="/banners/circleK"
      reportsEndpoint="/banners/reports/circleK"
      expectedColumns={EXPECTED_COLUMNS}
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
