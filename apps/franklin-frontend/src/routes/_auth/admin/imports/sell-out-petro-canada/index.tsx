'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-out-petro-canada/')({
  component: ImportSellOutPetroCanadaPage,
  staticData: {
    title: 'route.importSellOutPetroCanada',
    crumb: 'route.importSellOutPetroCanada',
  },
})

function ImportSellOutPetroCanadaPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Petro Canada Sell-Out"
      description="Upload the Petro Canada sell-out Excel file"
      uploadEndpoint="/banners/petrocanada"
      reportsEndpoint="/banners/reports/petrocanada"
      expectedColumns={[]}
      unit="rows"
      uploadType="sell-out-petro-canada"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-out-petro-canada/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
