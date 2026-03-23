'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-nap-orange/')({
  component: ImportSellOutNapOrangePage,
  staticData: {
    title: 'route.importSellOutNapOrange',
    crumb: 'route.importSellOutNapOrange',
  },
})

function ImportSellOutNapOrangePage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="NAP Orange Sell-Out"
      description="Upload the NAP Orange sell-out Excel file"
      uploadEndpoint="/banners/napOrange"
      reportsEndpoint="/banners/reports/napOrange"
      expectedColumns={[]}
      unit="rows"
      uploadType="sell-out-nap-orange"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-nap-orange/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
