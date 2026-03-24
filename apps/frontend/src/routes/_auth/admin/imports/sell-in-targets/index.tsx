'use no memo'

import { ImportPage } from '@/components/ImportPage'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/imports/sell-in-targets/')({
  component: ImportSellInTargetsPage,
  staticData: {
    title: 'route.importSellInTargets',
    crumb: 'route.importSellInTargets',
  },
})

const EXPECTED_COLUMNS = ['Id', 'Target', 'Period Name', 'Start Date', 'End Date']

function ImportSellInTargetsPage() {
  const navigate = useNavigate()
  return (
    <ImportPage
      title="Sell-In Targets"
      description="Upload the sell-in targets file"
      uploadEndpoint="/customers/targets"
      reportsEndpoint="/customers/targets/reports"
      expectedColumns={EXPECTED_COLUMNS}
      unit="targets"
      uploadType="customer-targets"
      accept={['.xlsx', '.xls']}
      onBack={() => navigate({ to: '/admin/imports' })}
      onRowClick={(report) =>
        navigate({
          to: '/admin/imports/sell-in-targets/$reportId',
          params: { reportId: String(report.id) },
          state: { report },
        })
      }
    />
  )
}
