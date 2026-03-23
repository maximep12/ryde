'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-7-eleven/')({
  component: ImportSellOut7ElevenPage,
  staticData: {
    title: 'route.importSellOut7Eleven',
    crumb: 'route.importSellOut7Eleven',
  },
})

function ImportSellOut7ElevenPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="7-Eleven Sell-Out"
      description="Upload the 7-Eleven sell-out Excel file"
      uploadEndpoint="/banners/7eleven"
      reportsEndpoint="/banners/reports/7eleven"
      expectedColumns={[]}
      unit="rows"
      uploadType="sell-out-7-eleven"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-7-eleven/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
