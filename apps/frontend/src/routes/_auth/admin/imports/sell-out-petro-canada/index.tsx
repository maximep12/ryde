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

const EXPECTED_COLUMNS = [
  'Unit Sales (sheet)',
  '$ Sales (sheet)',
  'Product Name',
  'UPC',
  'Brand',
  'Store Number',
]

function ImportSellOutPetroCanadaPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Petro Canada Sell-Out"
      description="Upload the Petro Canada sell-out Excel file (Unit Sales + $ Sales sheets)"
      uploadEndpoint="/banners/petrocanada"
      reportsEndpoint="/banners/reports/petrocanada"
      expectedColumns={EXPECTED_COLUMNS}
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
